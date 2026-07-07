<template>
  <div class="album-row-container">
    <div class="albumRow" :class="{ 'track-unavailable': isUnavailableSong(track) }" v-for="(track, $index) in tracks" :key="$index" @click="play(tracks,$index)">
      <div class="album-index">
        {{ $index + 1 }}
      </div>
      <div class="album-songname">
        <div class="album-content">
          {{ track.name }}
          <span class="vip-badge" v-if="isVipSong(track)">VIP</span>
        </div>
      </div>
      <div class="album-plus-icon" @click.stop="openAddToPlaylist(track)">
        <i class="fa fa-plus"></i>
      </div>
      <div class="album-download-icon" @click.stop="download(track)">
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
import { isVipSong, isUnavailableSong } from '../utils/songBadge';

export default {
  props:['tracks', 'albumInfo'],
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
    isVipSong,
    isUnavailableSong,
    ...mapMutations({
      pushToPlayer:'PushTracks',
      toPlay:'RequestTrackPlayback'
    }),
    play(tracks,index){
      this.pushToPlayer(tracks);
      this.toPlay(index);
      this.$store.commit('SetSingleTrackPlayback', false);
    },
    openAddToPlaylist(track) {
      // 专辑歌曲可能没有封面，从 albumInfo prop 获取
      this.currentSongToAdd = {
        id: track.id,
        name: track.name,
        artist: track.ar && track.ar[0] ? track.ar[0].name : '',
        album: track.al ? track.al.name : (this.albumInfo ? this.albumInfo.name : ''),
        cover: track.al ? track.al.picUrl : (this.albumInfo ? this.albumInfo.picUrl : '')
      };
      this.showAddPopup = true;
    },
    download(track) {
      // 从 track.ar 或 track.artists 获取艺术家名
      const artistName = track.ar && track.ar[0] ? track.ar[0].name :
                         (track.artists && track.artists[0] ? track.artists[0].name : '');
      // 打开音质选择弹窗，由弹窗完成资源检查和下载
      this.downloadTarget = {
        id: track.id,
        name: track.name,
        artist: artistName
      };
      this.showDownloadPopup = true;
    }
  }
};
</script>

<style lang="scss">
.albumRow {
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
.albumRow:hover {
  background-color: rgba(210, 210, 210, 0.6);
}
.album-index{
    margin:auto 0;
    width:50px;
}
.album-songname {
  border-left-style: ridge;
  margin-left: 10px;
  font-size: 16px;
  width: 200px;
  height: 50px;
  overflow: hidden;
  display: flex;
  justify-content: center;
}
.album-content {
  margin: auto;
  color: var(--text-primary);
}
.album-plus-icon {
  margin: auto 0;
  color:rgb(246,0,46);
  font-size:20px;
  display: flex;
  flex-direction: row;
  justify-content:flex-end;
  margin-right: 10px;
  margin-left: auto;
  width: auto;
  cursor: pointer;
}
.album-download-icon {
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
.album-download-icon:hover {
  color: rgb(0, 100, 200);
  transform: scale(1.1);
}
a {
  color: black;
}
</style>
