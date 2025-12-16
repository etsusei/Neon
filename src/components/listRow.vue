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
      const filename = `${track.name} - ${artistName}`;
      
      // 使用后端代理下载接口，直接触发浏览器下载
      const downloadUrl = `https://neon.zeabur.app/api/music/download?id=${track.id}&name=${encodeURIComponent(filename)}`;
      
      console.log(`[下载] 开始: ${filename}`);
      
      // 创建隐藏的 iframe 触发下载，避免页面跳转
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = downloadUrl;
      document.body.appendChild(iframe);
      
      // 5秒后移除 iframe
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
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

/* Mobile Optimization */
@media screen and (max-width: 520px) {
  .head-listRow {
    display: none;
  }

  .listRow {
    display: grid;
    grid-template-columns: 50px 1fr auto;
    grid-template-rows: auto auto;
    gap: 0 12px;
    padding: 8px 0;
    width: 100%;
    align-items: center;
    border-bottom: 0.5px solid rgba(0,0,0,0.05);
    background-color: transparent !important;
  }

  .listRow:hover {
    background-color: transparent;
  }

  .list-album-img {
    grid-row: 1 / 3;
    grid-column: 1;
    width: 50px;
    height: 50px;
    margin: 0;
    padding: 0;
    border-radius: 8px;
  }

  .list-songname {
    grid-row: 1;
    grid-column: 2;
    border: none;
    margin: 0;
    width: 100%;
    height: auto;
    justify-content: flex-start;
    align-items: flex-end;
    padding-bottom: 2px;
  }

  .list-content {
    font-size: 15px;
    text-align: left;
    margin: 0;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .list-artist {
    grid-row: 2;
    grid-column: 2;
    width: 100%;
    height: auto;
    justify-content: flex-start;
    align-items: flex-start;
  }

  .list-artist .list-content .link {
    font-size: 12px;
    color: #888;
    text-decoration: none !important;
    margin: 0;
    text-align: left;
    display: block;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .list-artist .list-content {
     margin: 0;
     width: 100%;
  }

  .list-albuminfo {
    display: none;
  }

  .plus-icon {
    grid-row: 1 / 3;
    grid-column: 3;
    margin: 0 4px;
    width: 30px;
    height: 30px;
  }

  .download-icon {
    display: none;
  }
}
</style>