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
  margin-right: 20px;
  width:100%;
}
a {
  color: black;
}
</style>