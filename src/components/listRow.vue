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
    <div class="listRow" v-for="(track, $index) in tracks" :key="$index" @click="play(tracks,$index)">
      <div
        class="list-album-img"
        :style="{ backgroundImage: `url(${track.al.picUrl})` }"
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
  </div>
</template>

<script>
import {mapMutations} from 'vuex';
import AddToPlaylistPopup from './AddToPlaylistPopup.vue';

export default {
  props: ["tracks"],
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
      toPlay:'GetIndex',
      pushIndex: 'PushIndex'
    }),
    play(tracks,index){
      this.pushToPlayer(tracks);
      this.toPlay(index);
      // pushIndex 已被移除，由 GetIndex 统一处理
      this.$store.commit('SetSinglePlay', false); // 歌单播放，非单次模式
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
    async download(track) {
      const artistName = track.ar && track.ar[0] ? track.ar[0].name : 'Unknown';
      const filename = `${track.name} - ${artistName}.mp3`;
      
      // 方法1: 尝试原接口
      const qualities = ['exhigh', 'standard'];
      const apiTemplate = (id, level) => 
        `https://api.kxzjoker.cn/api/163_music?url=https://y.music.163.com/m/song?id=${id}&userid=8719916627&dlt=0846&level=${level}&type=json`;
      
      for (const quality of qualities) {
        try {
          const response = await fetch(apiTemplate(track.id, quality));
          const data = await response.json();
          
          if (data.status === 200 && data.url) {
            console.log(`[下载] 原接口成功: ${filename}`);
            await this.downloadFile(data.url, filename);
            return;
          }
        } catch (e) {
          console.warn(`[下载] 原接口 ${quality} 失败`);
        }
      }
      
      // 方法2: 使用代理接口
      console.log('[下载] 原接口失败，尝试代理接口...');
      try {
        const proxyResponse = await fetch(`https://neon.zeabur.app/proxy?id=${track.id}`);
        const proxyData = await proxyResponse.json();
        
        if (proxyData.code === 200 && proxyData.url) {
          console.log(`[下载] 代理接口成功: ${filename}`);
          await this.downloadFile(proxyData.url, filename);
          return;
        }
      } catch (e) {
        console.error('[下载] 代理接口也失败:', e);
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
  color: black;
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