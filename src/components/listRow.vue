<template>
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
    <div class="plus-icon">
      <i class="fa fa-plus"></i>
    </div>
    <div class="download-icon" @click.stop="download(track)">
      <i class="fa fa-download"></i>
    </div>
  </div>
</template>

<script>
import {mapMutations} from 'vuex';
export default {
  props: ["tracks"],
  data() {
    return {};
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
      this.pushIndex(index);
    },
    async download(track) {
      const qualities = ['exhigh', 'standard'];
      const apiTemplate = (id, level) => 
        `https://api.kxzjoker.cn/api/163_music?url=https://y.music.163.com/m/song?id=${id}&userid=8719916627&dlt=0846&level=${level}&type=json`;
      
      for (const quality of qualities) {
        try {
          const response = await fetch(apiTemplate(track.id, quality));
          const data = await response.json();
          
          if (data.status === 200 && data.url) {
            const ext = data.level && data.level.includes('无损') ? '.flac' : '.mp3';
            const filename = `${track.name} - ${track.ar[0].name}${ext}`;
            
            console.log(`开始下载: ${filename} (${data.level || quality})`);
            
            // 使用 fetch 获取文件内容，再创建 Blob 下载
            try {
              const fileResponse = await fetch(data.url);
              const blob = await fileResponse.blob();
              const blobUrl = URL.createObjectURL(blob);
              
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              // 释放 Blob URL
              setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
              
              console.log(`下载完成: ${filename}`);
            } catch (downloadErr) {
              // 如果 fetch 下载失败（可能是跨域），直接打开链接
              console.warn('Blob下载失败，尝试直接打开:', downloadErr);
              window.open(data.url, '_blank');
            }
            return;
          }
        } catch (e) {
          console.error(`音质 ${quality} 获取失败:`, e);
        }
      }
      
      alert('获取下载链接失败，请稍后重试');
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