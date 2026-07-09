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
import { thumb } from "../utils/imgThumb";
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
          this.artistImg = thumb(result.data.album.artist.img1v1Url, 100);
          this.detail = result.data.album.description;
          this.imgCover = thumb(result.data.album.blurPicUrl, 500);
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
  width: 100%;
  max-width: 1480px;
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

/* Mobile Optimization: 详情页头部竖排 + 大封面居中 */
@media screen and (max-width: 520px) {
  .album-wrapper {
    width: 100%;
    padding: 0 0 24px 0;
    height: auto;
    border-radius: 0;
  }

  .info-section {
    flex-direction: column;
    align-items: center;
    height: auto;
    padding-top: 20px;
    padding-bottom: 20px;
  }

  .img-cover {
    width: 220px;
    height: 220px;
    margin: 0 auto 20px auto;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .info-right {
    margin: 0;
    align-items: center;
    width: 100%;
  }

  .album-name {
    font-size: 24px;
    text-align: center;
    margin-bottom: 8px;
    width: 100%;
    word-break: break-all;
  }

  .artist-info {
    justify-content: center;
    margin-bottom: 16px;
  }

  .details {
    width: 100%;
    height: auto;
    max-height: 80px;
    margin-top: 0;
    background: transparent;
    padding: 0 10px;
  }

  .details p {
    margin: 0;
    text-align: center;
    color: var(--text-secondary, #666);
    font-size: 13px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
</style>