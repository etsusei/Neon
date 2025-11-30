<template>
  <div class="search-warpper">
    <el-tabs type="border-card">
      <el-tab-pane label="Song"><list-search :result="songResult"/></el-tab-pane>
      <el-tab-pane label="Album"><search-album :result="albumResult" /></el-tab-pane>
      <el-tab-pane label="Artist"><search-artist :result="artistResult" /></el-tab-pane>
      <el-tab-pane label="List"><search-list :result="listResult"/></el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import listSearch from "../components/listSearch.vue"
import searchAlbum from "../components/searchAlbum.vue"
import searchArtist from "../components/searchArtist.vue"
import searchList from "../components/searchList.vue"
import {searchSongs,searchAlbums,searchArtists,searchLists} from "../api/neteaseApi"
export default {
    components:{
        listSearch,
        searchAlbum,
        searchArtist,
        searchList
    },
    props:['keyword'],
    data(){
      return{
        songResult:null,
        albumResult:null,
        artistResult:null,
        listResult:null
      }
    },
    methods:{
      getSongs(){
        searchSongs(this.keyword).then((result)=>{
          if(result.data.code=="200"){
            this.songResult=result.data.result.songs;
          }
        })
      },
      getAlbums(){
        searchAlbums(this.keyword).then((result)=>{
          if(result.data.code=="200"){
            this.albumResult=result.data.result.albums;
          }
        })
      },
      getArtists(){
        searchArtists(this.keyword).then((result)=>{
          if(result.data.code=="200"){
            this.artistResult=result.data.result.artists;
          }
        })
      },
      getLists(){
        searchLists(this.keyword).then((result)=>{
          if(result.data.code=="200"){
            this.listResult=result.data.result.playlists;
          }
        })
      }
    },
    mounted(){
      this.getSongs();
      this.getAlbums();
      this.getArtists();
      this.getLists();
    }
};
</script>

<style lang="scss">
.search-warpper{
  width: 1480px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 32px;
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
div#pane-2 {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin: auto 0;
}
div#pane-3 {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin: auto 0;
}
.el-tabs--border-card>.el-tabs__header {
    background-color: rgba(255,255,255,0.5);
    border-bottom: none;
    margin: 0;
    border-radius: 0 0 10px 10px;
}
.el-tabs--border-card>.el-tabs__header .el-tabs__item.is-active {
    color:none;
    background-color: #00000012;
    border-radius: 0 0 10px 10px;
     border-right-color: none; 
    border-left-color:none 
}
</style>