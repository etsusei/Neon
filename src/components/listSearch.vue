<template>
  <div class="list-search-container" ref="scrollContainer" @scroll="handleScroll">
    <div class="head-listRow">
      <div class="head-list-album-img"></div>
      <div class="head-list-songname">
        <div class="head-list-content">Song</div>
      </div>
      <div class="head-list-albuminfo">
        <div class="head-list-content">Album</div>
      </div>
      <div class="head-list-artist">
        <div class="head-list-content">Artist</div>
      </div>
      <div class="head-plus-icon"></div>
      <div class="head-download-icon"></div>
    </div>
    <div class="listRow" v-for="(track, $index) in result" :key="$index" @click="play(result,$index)">
      <div
        class="list-album-img"
        :style="{ backgroundImage: `url(${thumb(track.album && track.album.img1v1Url ? track.album.img1v1Url : '', 100)})` }"
      ></div>
      <div class="list-songname">
        <div class="list-content">{{ track.name }}</div>
      </div>
      <div class="list-albuminfo">
        <div class="list-content">
          <router-link :to="{name:'Album',params:{albumId:`${track.album ? track.album.id : ''}`}}">
          <p class="link">{{ track.album ? track.album.name : '' }}</p>
          </router-link>
        </div>
      </div>
      <div class="list-artist">
        <div class="list-content">
          <router-link :to="{name:'Artist',params:{artistId:`${track.artists && track.artists[0] ? track.artists[0].id : ''}`}}">
          <p class="link">{{ track.artists && track.artists[0] ? track.artists[0].name : '' }}</p>
          </router-link>
        </div>
      </div>
      <div class="plus-icon" @click.stop="openAddToPlaylist(track)">
        <i class="fa fa-plus"></i>
      </div>
      <div class="download-icon" @click.stop="download(track)">
        <i class="fa fa-download"></i>
      </div>
    </div>
    <!-- 加载状态 -->
    <div class="load-more-section" v-if="loading || hasMore">
      <div v-if="loading" class="loading-spinner">
        <i class="fa fa-spinner fa-spin"></i>
        <span>加载中...</span>
      </div>
      <div v-else-if="hasMore" class="load-more-hint">
        <span>滚动加载更多</span>
      </div>
    </div>
    <div v-if="!hasMore && result && result.length > 0" class="no-more">
      <span>没有更多了</span>
    </div>
    
    <!-- 添加到歌单弹窗 -->
    <add-to-playlist-popup
      :show="showAddPopup"
      :song="currentSongToAdd"
      @close="showAddPopup = false"
    />

    <!-- 下载音质选择弹窗 -->
    <download-quality-popup
      :show="showDownloadPopup"
      :song="downloadTarget"
      @close="showDownloadPopup = false"
    />
  </div>
</template>

<script>
import {mapMutations} from 'vuex';
import AddToPlaylistPopup from './AddToPlaylistPopup.vue';
import DownloadQualityPopup from './DownloadQualityPopup.vue';
import { thumb } from '../utils/imgThumb';

export default {
  props: {
    result: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    hasMore: {
      type: Boolean,
      default: true
    }
  },
  components: {
    AddToPlaylistPopup,
    DownloadQualityPopup
  },
  data() {
    return {
      showAddPopup: false,
      currentSongToAdd: null,
      showDownloadPopup: false,
      downloadTarget: null
    };
  },
  methods:{
     thumb,
     ...mapMutations({
      pushToPlayer:'PushSearchTracks',
      toPlay:'RequestTrackPlayback'
    }),
    play(tracks, index){
      // 搜索单曲：只推送这一首歌，设置单次播放模式
      const singleTrack = [tracks[index]];
      this.pushToPlayer(singleTrack);
      this.toPlay(0); // 索引为 0，因为只有一首歌
      this.$store.commit('SetSingleTrackPlayback', true);
    },
    download(track) {
      // 打开音质选择弹窗，由弹窗完成资源检查和下载
      this.downloadTarget = {
        id: track.id,
        name: track.name,
        artist: track.artists && track.artists[0] ? track.artists[0].name : ''
      };
      this.showDownloadPopup = true;
    },
    handleScroll(e) {
      const container = e.target;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      // 距离底部100px时触发加载
      if (scrollHeight - scrollTop - clientHeight < 100) {
        if (!this.loading && this.hasMore) {
          this.$emit('load-more');
        }
      }
    },
    openAddToPlaylist(track) {
      this.currentSongToAdd = {
        id: track.id,
        name: track.name,
        artist: track.artists && track.artists[0] ? track.artists[0].name : '',
        album: track.album ? track.album.name : '',
        cover: track.album ? track.album.img1v1Url : ''
      };
      this.showAddPopup = true;
    }
  }
};
</script>

<style lang="scss">
.list-search-container {
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
}
.list-search-container::-webkit-scrollbar {
  width: 8px;
  border-radius: 10px;
}
.list-search-container::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: rgba(121, 121, 121, 0.3);
}
.list-search-container::-webkit-scrollbar-track {
  border-radius: 10px;
}
.row-head {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  background-color: white;
  width: 100%;
}
.img-null {
  width: 50px;
  padding: 0 0 0 60px;
}
.head-one,
.head-two,
.head-three {
  margin: auto;
  width: 100%;
}
.listRow {
  //background-color: white;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  width: 100%;
  padding: 5px 0 5px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}
.listRow:hover {
  background-color: rgba(210, 210, 210, 0.6);
}
.list-album-img {
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  width: 50px;
  height: 50px;
  border-radius: 10px;
  margin: auto 0;
  padding: 0 0 0 50px;
}
.list-songname {
  border-left-style: ridge;
  margin-left: 10px;
}
.list-songname,
.list-albuminfo,
.list-artist {
  font-size: 16px;
  width: 100%;
  height: 50px;
  overflow: hidden;
  display: flex;
  justify-content: center;
}
.list-content {
  margin: auto;
  color: var(--text-primary);
}
.plus-icon {
  margin: auto 0;
  color: rgb(246, 0, 46);
  font-size: 20px;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-right: 10px;
  width: auto;
}
.download-icon {
  margin: auto 0;
  color: rgb(0, 150, 246);
  font-size: 20px;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-right: 20px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.download-icon:hover {
  color: rgb(0, 100, 200);
  transform: scale(1.1);
}
.link{
  color: var(--text-primary);
}
.link:hover {
  text-decoration: underline;
}
.head-listRow {
  background-color: rgba(0, 0, 0, 0.027);
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  width: 100%;
  padding: 5px 0 5px 10px;
  border-radius: 10px;
  cursor: default;
  position: sticky;
  top: 0;
  z-index: 1;
}
.head-list-album-img {
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  width: 50px;
  height: 50px;
  border-radius: 10px;
  margin: auto 0;
  padding: 0 0 0 50px;
}
.head-list-songname {
  margin-left: 10px;
}
.head-list-songname,
.head-list-albuminfo,
.head-list-artist {
  font-size: 16px;
  width: 100%;
  height: 50px;
  overflow: hidden;
  display: flex;
  justify-content: center;
}
.head-list-content {
  margin: auto;
}
.head-plus-icon {
  margin: auto 0;
  color: rgb(246, 0, 46);
  font-size: 20px;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-right: 10px;
  width: auto;
}
.head-download-icon {
  margin: auto 0;
  font-size: 20px;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-right: 20px;
  width: 20px;
}

/* 加载状态样式 */
.load-more-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  color: #666;
}
.loading-spinner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  i {
    font-size: 18px;
    color: rgb(246, 0, 46);
  }
}
.load-more-hint {
  font-size: 12px;
  color: #999;
}
.no-more {
  display: flex;
  justify-content: center;
  padding: 15px;
  font-size: 12px;
  color: #999;
}
</style>
