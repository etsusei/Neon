<template>
  <div class="home-warpper">
    <h1>Trending List</h1>
    <div class="trending-row">
      <search-list :result="trendList"/>
    </div>
    <h1>Ranking</h1>
    <div class="ranking-row">
      <search-list :result="rankList" />
    </div>
  </div>
</template>

<script>
import {getTrendList,getRank} from "../api/neteaseApi"
import SearchList from '../components/searchList.vue';

export default {
  components: {
    SearchList,
  },
  data(){
    return{
      trendList:null,
      rankList:null,
    }
  },
  methods:{
    getTrend(){
      getTrendList().then((result)=>{
        if(result.data.code=="200"){
          this.trendList=result.data.playlists;
        }
      })
    },
    getRankList(){
      getRank().then((result)=>{
        console.log('getRank result:', result);
        if(result.data.code=="200"){
          this.rankList=result.data.list;
          console.log('rankList set:', this.rankList);
          if (this.rankList) {
             console.log('rankList length:', this.rankList.length);
             console.log('rankList content:', JSON.stringify(this.rankList));
          }
        } else {
          console.error('getRank failed:', result.data);
        }
      }).catch(err => {
        console.error('getRank error:', err);
      })
    }
  },
  mounted(){
    this.getTrend();
    this.getRankList();
  }
};
</script>

<style lang="scss">
h1 {
  text-align: left;
  width:fit-content;
  padding: 0 0 0 0px;
  border-radius: 32px;
}
.home-warpper {
  width: 1480px;
  display: flex;
  flex-direction: column;
}
.trending-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin: auto 0;
  height: 530px;
  overflow-x: auto;
  overflow-y: auto;
  border-radius: 32px;
  background-color: rgba(196, 196, 196, 0.3);
}
.ranking-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin: auto 0;
  height: 530px;
  overflow: auto;
  border-radius: 32px;
  background-color: rgba(196, 196, 196, 0.3);
}
.trending-row::-webkit-scrollbar {
  width: 8px;
  border-radius: 10px;
}
.trending-row::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: rgba(121, 121, 121, 0.3);
}
.trending-row::-webkit-scrollbar-track {
  border-radius: 10px;
}
.ranking-row::-webkit-scrollbar {
  width: 8px;
  border-radius: 10px;
}
.ranking-row::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: rgba(121, 121, 121, 0.3);
}
.ranking-row::-webkit-scrollbar-track {
  border-radius: 10px;
}
</style>