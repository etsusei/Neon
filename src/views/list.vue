<template>
  <div class="album-wrapper">
    <div class="info-section">
      <div
        class="backblur"
        :style="{ backgroundImage: `url(${imgCover})` }"
      ></div>
      <div
        class="img-cover"
        :style="{ backgroundImage: `url(${imgCover})` }"
      ></div>
      <div class="info-right">
        <div class="album-name">{{ listName }}</div>
        <div class="artist-info">
          <div
            class="artist-img"
            :style="{ backgroundImage: `url(${creatorImg})` }"
          ></div>
          <div class="artist-name">{{ creatorName }}</div>
        </div>
        <div class="details">
          <p>{{ detail }}</p>
        </div>
      </div>
    </div>
    <div class="list-section">
      <list-row :tracks="this.songlist" :editable="canEdit" @remove-track="removeTrack"/>
      <!-- 懒加载哨兵：滚动接近底部时触发加载下一批 -->
      <div ref="sentinel" class="load-sentinel">
        <span v-if="loading">加载中…</span>
        <span v-else-if="noMore && songlist && songlist.length">已全部加载</span>
      </div>
    </div>
  </div>
</template>

<script>
import listRow from "../components/listRow.vue";
import { getPlayListInfo, getSongsDetailChunk, mergePrivileges } from "../api/neteaseApi";
import { removeTracksFromNeteasePlaylist } from "../api/neteaseUserApi";
import { isNeteaseLoggedIn, getNeteaseProfile } from "../utils/neteaseAuth";
import { thumb } from "../utils/imgThumb";
import { ElMessage } from "element-plus/es/components/message";
import { ElMessageBox } from "element-plus/es/components/message-box";

const BATCH_SIZE = 50;

export default {
  components: {
    listRow,
  },
  props:['listId'],
  data() {
    return {
      creatorName: "",
      creatorImg: "",
      imgCover: "",
      listName: "",
      detail: "",
      songs: null,        // 全部 trackIds（只有 id）
      songlist: [],       // 已加载的歌曲对象，按顺序追加
      loadedCount: 0,     // 已请求到的 trackIds 数量
      loading: false,
      noMore: false,
      observer: null,
      creatorId: null,    // 歌单创建者，用于判断是否可编辑
    };
  },
  computed: {
    // 网易云登录且是自己创建的歌单才能删歌
    canEdit() {
      if (!this.creatorId || !isNeteaseLoggedIn()) return false;
      const profile = getNeteaseProfile();
      return !!(profile && profile.userId === this.creatorId);
    },
  },
  methods: {
    getPlayList() {
      getPlayListInfo(this.listId).then((result) => {
        if (result.data.code == "200") {
          this.creatorImg = thumb(result.data.playlist.creator.avatarUrl, 100);
          this.creatorName = result.data.playlist.creator.nickname;
          this.creatorId = result.data.playlist.creator.userId;
          this.listName = result.data.playlist.name;
          this.detail = result.data.playlist.description;
          this.songs = result.data.playlist.trackIds || [];
          this.imgCover = thumb(result.data.playlist.coverImgUrl, 500);
          // 重置加载状态，先拉第一批
          this.songlist = [];
          this.loadedCount = 0;
          this.noMore = this.songs.length === 0;
          this.loadNextBatch();
        }
      }).catch((e) => {
        console.error("[list] 歌单信息加载失败:", e);
      });
    },
    // 从自己的网易云歌单里删除歌曲（确认弹窗风格与本地歌单一致）
    async removeTrack(track) {
      try {
        await ElMessageBox.confirm(`确定要从歌单中移除「${track.name}」吗？`, "确认移除", {
          confirmButtonText: "移除",
          cancelButtonText: "取消",
          type: "warning",
        });

        const res = await removeTracksFromNeteasePlaylist(this.listId, track.id);
        if (res.data.code === 200 || (res.data.body && res.data.body.code === 200)) {
          // 同步本地状态：展示列表、trackIds、懒加载游标一起修
          this.songlist = this.songlist.filter((s) => s.id !== track.id);
          const idx = (this.songs || []).findIndex((t) => t.id === track.id);
          if (idx > -1) {
            this.songs.splice(idx, 1);
            if (idx < this.loadedCount) this.loadedCount--;
          }
          ElMessage.success("已移除");
        } else {
          ElMessage.error(res.data.msg || res.data.message || "移除失败");
        }
      } catch (err) {
        if (err !== "cancel") {
          ElMessage.error("移除失败");
        }
      }
    },
    // 懒加载：每次只拉下一批 BATCH_SIZE 首；滚动接近底部时再拉下一批。
    // 既避免巨型请求在弱网整体卡死（分批），又避免进页面就全拉（懒加载）。
    async loadNextBatch() {
      if (this.loading || this.noMore) return;
      const chunk = this.songs.slice(this.loadedCount, this.loadedCount + BATCH_SIZE);
      if (chunk.length === 0) { this.noMore = true; return; }
      this.loading = true;
      const idsStr = chunk.map(t => t.id).join(",");
      try {
        const result = await getSongsDetailChunk(idsStr);
        if (result.data && result.data.code == 200 && Array.isArray(result.data.songs)) {
          this.songlist = this.songlist.concat(mergePrivileges(result.data));
          this.loadedCount += chunk.length;
          if (this.loadedCount >= this.songs.length) this.noMore = true;
        }
        // 失败则不推进 loadedCount，下次滚动/重试会重新请求这一批
      } catch (e) {
        console.error("[list] 歌曲分批加载失败:", e);
      } finally {
        this.loading = false;
        // 首屏没填满时哨兵仍在视口内，继续补一批（IntersectionObserver 不会重复触发同一状态）
        this.$nextTick(() => this.checkSentinel());
      }
    },
    checkSentinel() {
      if (this.loading || this.noMore) return;
      const el = this.$refs.sentinel;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < (window.innerHeight || document.documentElement.clientHeight) + 300) {
        this.loadNextBatch();
      }
    },
    setupObserver() {
      const el = this.$refs.sentinel;
      if (!el) return;
      // 滚动容器是 AppMainLayout 的 .projects-section-content；找不到则退回视口
      const root = document.querySelector(".projects-section-content") || null;
      this.observer = new IntersectionObserver((entries) => {
        if (entries[0] && entries[0].isIntersecting) this.loadNextBatch();
      }, { root, rootMargin: "300px" });
      this.observer.observe(el);
    },
  },
  created() {
    this.getPlayList();
  },
  mounted() {
    this.setupObserver();
  },
  beforeUnmount() {
    if (this.observer) { this.observer.disconnect(); this.observer = null; }
  },
};
</script>

<style lang="scss">
.album-wrapper {
  width: 1480px;
  //height: 600px;
  display: flex;
  flex-direction: column;
  border-radius: 32px;
  //background-color: white;
}
.info-section {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  height: 300px;
  position: relative;
  overflow: hidden;
  //filter:blur(30px);
}
.img-cover {
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  width: 165px;
  height: 165px;
  border-radius: 10px;
  margin: auto 0;
  z-index: 1;
}
.info-right {
  display: flex;
  flex-direction: column;
  margin: auto 0;
  margin-left: 60px;
  z-index: 1;
}
.album-name {
  font-size: 25px;
  text-align: left;
}
.artist-info {
  display: flex;
  flex-direction: row;
}
.artist-img {
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  width: 30px;
  height: 30px;
  border-radius: 15px;
}
.artist-name {
  font-size: 16px;
  margin: auto 0;
  margin-left: 10px;
}
.details {
  background-color: rgba(255, 255, 255, 0.6);
  margin-top: 5px;
  border-radius: 16px;
  height: 100px;
  width: 400px;
  overflow: auto;
}
.details::-webkit-scrollbar {
  width: 8px;
  border-radius: 10px;
  //background:rgba(190, 190, 190, 0.6)
}
.details::-webkit-scrollbar-thumb {
  border-radius: 10px;
  //-webkit-box-shadow:inset 0 0 5px rgba(0,0,0,0.2);
  background: rgba(121, 121, 121, 0.3);
  cursor: pointer;
}
.details::-webkit-scrollbar-track {
  border-radius: 10px;
  cursor: pointer;
  //background: rgba(190, 190, 190, 0.6);
}
.p {
  margin: auto 0;
  height: 100%;
  width: 100%;
  text-align: left;
  margin-left: 18px;
}
.load-sentinel {
  width: 100%;
  min-height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 0;
  color: var(--text-primary);
  opacity: 0.6;
  font-size: 14px;
}
.backblur {
  position: absolute;
  height: 100%;
  width: 100%;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  border-radius: 32px;
  top: 0;
  filter: blur(30px);
}
</style>