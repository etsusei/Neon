<template>
  <div class="artist-wrapper">
    <div class="artist-section">
      <div
        class="backblur"
        :style="{ backgroundImage: `url(${imgCover})` }"
      ></div>
      <div
        class="artist-imgTop"
        :style="{ backgroundImage: `url(${imgCover})` }"
      ></div>
      <div class="artist-name">
        {{ artistName }}
      </div>
    </div>
    <div class="content-section">
      <el-tabs type="border-card">
        <el-tab-pane label="Trending"
          ><div class="container"><trending :tracks="trendSong"/></div
        ></el-tab-pane>
        <el-tab-pane label="Album"><cover :cover="albums"/></el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script>
import Trending from "../components/trending.vue";
import cover from "../components/cover.vue";
import { getArtistTrend,getArtistAlbum} from "../api/neteaseApi";
export default {
  components: {
    Trending,
    cover,
  },
  props:['artistId'],
  data() {
    return {
      artistImg: "",
      imgCover: "",
      artistName: "",
      detail: "",
      trendSong:null,
      albums:null
    };
  },
  methods:{
    getTrend(){
      getArtistTrend(this.artistId).then((result)=>{
        if(result.data.code=="200"){
          this.imgCover=result.data.artist.img1v1Url;
          this.artistName=result.data.artist.name;
          this.trendSong=result.data.hotSongs;
        }
      })
    },
    getAlbum(){
      getArtistAlbum(this.artistId).then((result)=>{
        if(result.data.code=="200"){
          this.albums=result.data.hotAlbums;
        }
      })
    }
  },
  mounted(){
    this.getTrend();
    this.getAlbum();
  }
};
</script>

<style lang="scss">
.artist-wrapper {
  width: 1480px;
  height: 100%;
  //height: 600px;
  display: flex;
  flex-direction: column;
  border-radius: 32px;
  //background-color: white;
}
.artist-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  height: 300px;
  position: relative;
  overflow: hidden;
  //filter:blur(30px);
}
.artist-imgTop {
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  width: 200px;
  height: 200px;
  border-radius: 10px;
  margin: auto;
  z-index: 1;
  margin-top: 40px;
}
.artist-name {
  font-size: 16px;
  margin: auto 0;
  z-index: 1;
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
// .backblur:after {
//   content: "";
//   width: 100%;
//   height: 100%;
//   position: absolute;
//   left: 0;
//   top: 0;
//   background: inherit;
//   filter: blur(15px);
//   z-index: 2;
// }
.container {
  overflow: auto;
}
.el-tabs--border-card {
  background: none;
  border: none;
  box-shadow: none;
}
div#pane-1 {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin: auto 0;
}
.el-tabs--border-card > .el-tabs__header {
  background-color: rgba(255, 255, 255, 0.5);
  border-bottom: none;
  margin: 0;
  border-radius: 0 0 10px 10px;
}
.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active {
  color: none;
  background-color: #00000012;
  border-radius: 0 0 10px 10px;
  border-right-color: none;
  border-left-color: none;
}
</style>