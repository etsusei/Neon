<template>
  <div class="album-row-container">
    <div class="albumRow" v-for="(track, $index) in tracks" :key="$index" @click="play(tracks,$index)">
      <div class="album-index">
        {{ $index + 1 }}
      </div>
      <div class="album-songname">
        <div class="album-content">{{ track.name }}</div>
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
  </div>
</template>

<script>
import {mapMutations} from 'vuex';
import AddToPlaylistPopup from './AddToPlaylistPopup.vue';

export default {
  props:['tracks', 'albumInfo'],
  components: {
    AddToPlaylistPopup
  },
  data() {
    return {
      showAddPopup: false,
      currentSongToAdd: null
    };
  },
  methods:{
    ...mapMutations({
      pushToPlayer:'PushTracks',
      toPlay:'GetIndex'
    }),
    play(tracks,index){
      this.pushToPlayer(tracks);
      this.toPlay(index);
      this.$store.commit('SetSinglePlay', false); // 专辑播放，非单次模式
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
    async download(track) {
      // 从 track.ar 或 track.artists 获取艺术家名
      const artistName = track.ar && track.ar[0] ? track.ar[0].name : 
                         (track.artists && track.artists[0] ? track.artists[0].name : 'Unknown');
      const filename = `${track.name} - ${artistName}.mp3`;
      
      // 方法1: 优先使用 VIP 接口（后端统一接口）
      try {
        const response = await fetch(`https://neon.zeabur.app/api/music/url?id=${track.id}`);
        const data = await response.json();
        
        if (data.code === 200 && data.data && data.data.url) {
          console.log(`[下载] VIP接口成功 (${data.data.source}): ${filename}`);
          await this.downloadFile(data.data.url, filename);
          return;
        }
      } catch (e) {
        console.warn('[下载] VIP接口失败:', e);
      }
      
      // 方法2: 备用第三方接口
      console.log('[下载] VIP接口失败，尝试第三方接口...');
      const qualities = ['exhigh', 'standard'];
      const apiTemplate = (id, level) => 
        `https://api.kxzjoker.cn/api/163_music?url=https://y.music.163.com/m/song?id=${id}&userid=8719916627&dlt=0846&level=${level}&type=json`;
      
      for (const quality of qualities) {
        try {
          const response = await fetch(apiTemplate(track.id, quality));
          const data = await response.json();
          
          if (data.status === 200 && data.url) {
            console.log(`[下载] 第三方接口成功: ${filename}`);
            await this.downloadFile(data.url, filename);
            return;
          }
        } catch (e) {
          console.warn(`[下载] 第三方接口 ${quality} 失败`);
        }
      }
      
      alert('获取下载链接失败，请稍后重试');
    },
    async downloadFile(url, filename) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        console.log(`[下载] 完成: ${filename}`);
      } catch (e) {
        console.warn('[下载] Blob下载失败，尝试直接打开');
        window.open(url, '_blank');
      }
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