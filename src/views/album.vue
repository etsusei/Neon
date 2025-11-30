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
        <div class="album-name">{{ albumName }}</div>
        <div class="artist-info">
          <div
            class="artist-img"
            :style="{ backgroundImage: `url(${artistImg})` }"
          ></div>
          <div class="artist-name">{{ artistName }}</div>
        </div>
        <div class="details">
          <p>{{ detail }}</p>
        </div>
      </div>
    </div>
    <div class="list-section">
      <album-row :tracks="songs"/>
    </div>
  </div>
</template>

<script>
import { getAlbumInfo } from "../api/neteaseApi";
import AlbumRow from '../components/albumRow.vue';
export default {
  components: {
    AlbumRow,
  },
  props:['albumId'],
  data() {
    return {
      songs: [
        {
          name: "",
          id: null,
        },
      ],
      albumName: "",
      artistImg: "",
      imgCover: "",
      artistName: "",
      detail: "",
    };
  },
  methods: {
    getAlbum() {
      getAlbumInfo(this.albumId).then((result) => {
        if (result.data.resourceState == true) {
          this.artistName = result.data.album.artist.name;
          this.albumName = result.data.album.name;
          this.artistImg = result.data.album.artist.img1v1Url;
          this.detail = result.data.album.description;
          this.imgCover = result.data.album.blurPicUrl;
          this.songs = result.data.songs;
        }
      });
    },
  },
  mounted() {
    this.getAlbum();
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
  // border-radius: 10px;
  // background: rgba(255, 255, 255, 0.6);
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