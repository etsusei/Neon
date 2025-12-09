<template>
  <div class="albumRow" v-for="(track, $index) in tracks" :key="$index" @click="play(tracks,$index)">
    <div class="album-index">
      {{ $index + 1 }}
    </div>
    <div class="album-songname">
      <div class="album-content">{{ track.name }}</div>
    </div>
    <div class="album-plus-icon">
      <i class="fa fa-plus"></i>
    </div>
    <div class="album-download-icon" @click.stop="download(track)">
      <i class="fa fa-download"></i>
    </div>
  </div>
</template>

<script>
import {mapMutations} from 'vuex';
export default {
  props:['tracks'],
  data() {
    return {  
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
    },
    async download(track) {
      const qualities = ['exhigh', 'standard'];
      const apiTemplate = (id, level) => 
        `https://api.kxzjoker.cn/api/163_music?url=https://y.music.163.com/m/song?id=${id}&userid=8719916627&dlt=0846&level=${level}&type=json`;
      
      // 从 track.ar 或 track.artists 获取艺术家名
      const artistName = track.ar && track.ar[0] ? track.ar[0].name : 
                         (track.artists && track.artists[0] ? track.artists[0].name : 'Unknown');
      
      for (const quality of qualities) {
        try {
          const response = await fetch(apiTemplate(track.id, quality));
          const data = await response.json();
          
          if (data.status === 200 && data.url) {
            const ext = data.level && data.level.includes('无损') ? '.flac' : '.mp3';
            const filename = `${track.name} - ${artistName}${ext}`;
            
            console.log(`开始下载: ${filename} (${data.level || quality})`);
            
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
              
              setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
              console.log(`下载完成: ${filename}`);
            } catch (downloadErr) {
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
  width:100%;
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