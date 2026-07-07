<template>
  <div class="list-row-container">
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
    <div class="listRow" v-for="(track, $index) in displayTracks" :key="track.id || $index" @click="play(displayTracks,$index)">
      <div
        class="list-album-img"
        :style="{ backgroundImage: `url(${thumb(track.al.picUrl, 100)})` }"
      ></div>
      <div class="list-songname">
        <div class="list-content">{{ track.name }}</div>
      </div>
      <div class="list-albuminfo">
        <div class="list-content">
          <router-link :to="{name:'Album',params:{albumId:`${track.al.id}`}}">
          <p class="link">{{ track.al.name }}</p>
          </router-link>
        </div>
      </div>
      <div class="list-artist">
        <div class="list-content">
          <router-link :to="{name:'Artist',params:{artistId:`${track.ar[0].id}`}}">
          <p class="link">{{ track.ar[0].name }}</p>
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
  props: ["tracks"],
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
  computed: {
    // 过滤掉增量加载时的 null 占位，避免访问 track.al/track.ar 报错
    displayTracks() {
      return (this.tracks || []).filter(Boolean);
    }
  },
  methods:{
    thumb,
    ...mapMutations({
      pushToPlayer:'PushTracks',
      toPlay:'RequestTrackPlayback'
    }),
    play(tracks,index){
      this.pushToPlayer(tracks);
      this.toPlay(index);
      // Current track index is committed by the player after the request lands.
      this.$store.commit('SetSingleTrackPlayback', false);
    },
    openAddToPlaylist(track) {
      this.currentSongToAdd = {
        id: track.id,
        name: track.name,
        artist: track.ar && track.ar[0] ? track.ar[0].name : '',
        album: track.al ? track.al.name : '',
        cover: track.al ? track.al.picUrl : ''
      };
      this.showAddPopup = true;
    },
    download(track) {
      // 打开音质选择弹窗，由弹窗完成资源检查和下载
      this.downloadTarget = {
        id: track.id,
        name: track.name,
        artist: track.ar && track.ar[0] ? track.ar[0].name : ''
      };
      this.showDownloadPopup = true;
    }
  }
};
</script>

<style lang="scss">
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
.link {
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
</style>
