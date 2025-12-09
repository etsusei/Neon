<template>
  <div class="home-warpper">
    <h1>Trending List</h1>
    <div class="trending-row" ref="trendingContainer" @scroll="handleTrendingScroll">
      <div class="cover-warpper" v-for="(track, $index) in displayedTrendList" :key="'trend-'+$index">
        <router-link :to="{name:'List',params:{listId:`${track.id}`}}">
          <div class="cover">
            <img 
              :src="track.coverImgUrl" 
              referrerpolicy="no-referrer" 
              alt="cover" 
              @error="handleImageError($event, track)"
            />
          </div>
        </router-link>
        <div class="name">{{ track.name }}</div>
      </div>
      <div class="load-more-section" v-if="trendingHasMore">
        <div v-if="trendingLoading" class="loading-spinner">
          <i class="fa fa-spinner fa-spin"></i>
          <span>加载中...</span>
        </div>
      </div>
      <div v-if="!trendingHasMore && displayedTrendList.length > 0" class="no-more">
        <span>没有更多了</span>
      </div>
    </div>
    <h1>Ranking</h1>
    <div class="ranking-row" ref="rankingContainer" @scroll="handleRankingScroll">
      <div class="cover-warpper" v-for="(track, $index) in displayedRankList" :key="'rank-'+$index">
        <router-link :to="{name:'List',params:{listId:`${track.id}`}}">
          <div class="cover">
            <img 
              :src="track.coverImgUrl" 
              referrerpolicy="no-referrer" 
              alt="cover" 
              @error="handleImageError($event, track)"
            />
          </div>
        </router-link>
        <div class="name">{{ track.name }}</div>
      </div>
      <div class="load-more-section" v-if="rankingHasMore">
        <div v-if="rankingLoading" class="loading-spinner">
          <i class="fa fa-spinner fa-spin"></i>
          <span>加载中...</span>
        </div>
      </div>
      <div v-if="!rankingHasMore && displayedRankList.length > 0" class="no-more">
        <span>没有更多了</span>
      </div>
    </div>
  </div>
</template>

<script>
import {getTrendList,getRank} from "../api/neteaseApi"

const PAGE_SIZE = 8;

export default {
  data(){
    return{
      trendList: [],
      rankList: [],
      // Trending懒加载状态
      trendingDisplayCount: PAGE_SIZE,
      trendingLoading: false,
      // Ranking懒加载状态
      rankingDisplayCount: PAGE_SIZE,
      rankingLoading: false,
    }
  },
  computed: {
    displayedTrendList() {
      if (!this.trendList) return [];
      return this.trendList.slice(0, this.trendingDisplayCount);
    },
    trendingHasMore() {
      if (!this.trendList) return false;
      return this.trendingDisplayCount < this.trendList.length;
    },
    displayedRankList() {
      if (!this.rankList) return [];
      return this.rankList.slice(0, this.rankingDisplayCount);
    },
    rankingHasMore() {
      if (!this.rankList) return false;
      return this.rankingDisplayCount < this.rankList.length;
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
        if(result.data.code=="200"){
          this.rankList=result.data.list;
        }
      }).catch(err => {
        console.error('getRank error:', err);
      })
    },
    handleImageError(e, track) {
      track.imageError = true; 
      e.target.style.display = 'none';
    },
    handleTrendingScroll(e) {
      const container = e.target;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      if (scrollHeight - scrollTop - clientHeight < 100) {
        if (!this.trendingLoading && this.trendingHasMore) {
          this.loadMoreTrending();
        }
      }
    },
    loadMoreTrending() {
      this.trendingLoading = true;
      setTimeout(() => {
        this.trendingDisplayCount += PAGE_SIZE;
        this.trendingLoading = false;
      }, 300);
    },
    handleRankingScroll(e) {
      const container = e.target;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      if (scrollHeight - scrollTop - clientHeight < 100) {
        if (!this.rankingLoading && this.rankingHasMore) {
          this.loadMoreRanking();
        }
      }
    },
    loadMoreRanking() {
      this.rankingLoading = true;
      setTimeout(() => {
        this.rankingDisplayCount += PAGE_SIZE;
        this.rankingLoading = false;
      }, 300);
    }
  },
  mounted(){
    this.getTrend();
    this.getRankList();
  }
};
</script>

<style lang="scss" scoped>
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
.trending-row,
.ranking-row {
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
.cover-warpper {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 200px;
  width: 200px;
  margin: 30px 37px;
}
.cover {
  width: 175px;
  height: 175px;
  border-radius: 20px;
  margin: auto;
  cursor: pointer;
  overflow: hidden;
  position: relative;
}
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease-in-out;
}
.cover:hover img {
  transform: scale(1.05);
}
.name {
  text-align: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.trending-row::-webkit-scrollbar,
.ranking-row::-webkit-scrollbar {
  width: 8px;
  border-radius: 10px;
}
.trending-row::-webkit-scrollbar-thumb,
.ranking-row::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: rgba(121, 121, 121, 0.3);
}
.trending-row::-webkit-scrollbar-track,
.ranking-row::-webkit-scrollbar-track {
  border-radius: 10px;
}

/* 加载状态样式 */
.load-more-section {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 20px;
  color: #666;
}
.loading-spinner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  i {
    font-size: 18px;
    color: rgb(246, 0, 46);
  }
}
.no-more {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 15px;
  font-size: 12px;
  color: #999;
}

// 移动端响应式样式
@media screen and (max-width: 768px) {
  .home-warpper {
    width: 100%;
    padding: 0;
  }
  
  .trending-row,
  .ranking-row {
    height: auto;
    max-height: 400px;
    margin: 10px 0;
  }
  
  h1 {
    font-size: 24px;
    padding: 10px 0;
  }
  
  .cover-warpper {
    height: 60px;
    width: 100%;
    margin: 5px 0;
    padding: 5px 10px;
    flex-direction: row;
    align-items: center;
  }
  
  .cover {
    width: 50px;
    height: 50px;
    border-radius: 8px;
    margin: 0;
    flex-shrink: 0;
  }
  
  .cover:hover img {
    transform: none;
  }
  
  .name {
    flex: 1;
    padding-left: 12px;
    font-size: 14px;
    text-align: left;
  }
}

@media screen and (max-width: 520px) {
  h1 {
    font-size: 20px;
    padding: 8px 0;
  }
  
  .trending-row,
  .ranking-row {
    max-height: 300px;
    border-radius: 16px;
  }
}
</style>