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
  </div>
  <div class="listRow" v-for="(track, $index) in result" :key="$index" @click="play(result,$index)">
    <div
      class="list-album-img"
      :style="{ backgroundImage: `url(${track.album.img1v1Url})` }"
    ></div>
    <div class="list-songname">
      <div class="list-content">{{ track.name }}</div>
    </div>
    <div class="list-albuminfo">
      <div class="list-content">
        <router-link :to="{name:'Album',params:{albumId:`${track.album.id}`}}">
        <p class="link">{{ track.album.name }}</p>
        </router-link>
      </div>
    </div>
    <div class="list-artist">
      <div class="list-content">
        <router-link :to="{name:'Artist',params:{artistId:`${track.artists[0].id}`}}">
        <p class="link">{{ track.artists[0].name }}</p>
        </router-link>
      </div>
    </div>
    <div class="plus-icon">
      <i class="fa fa-plus"></i>
    </div>
  </div>
</template>

<script>
import {mapMutations} from 'vuex';
export default {
  props: ["result"],
  data() {
    return {};
  },
  methods:{
     ...mapMutations({
      pushToPlayer:'PushSearchTracks',
      toPlay:'GetIndex'
    }),
    play(tracks,index){
      this.pushToPlayer(tracks);
      this.toPlay(index);
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
  margin-right: 20px;
  width: 100%;
}
.link{
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
  margin-right: 20px;
  width: 100%;
}
</style>