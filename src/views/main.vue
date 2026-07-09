<template>
  <div class="home-warpper">
    <h1>Trending List</h1>
    <liquid-card class="list-card" border-radius="32px" :no-distortion="true">
      <div class="trending-row" ref="trendingContainer" @scroll="handleTrendingScroll">
        <div class="cover-warpper" v-for="(track, $index) in displayedTrendList" :key="'trend-'+$index">
          <router-link :to="{name:'List',params:{listId:`${track.id}`}}">
            <div class="cover">
              <skeleton-image :src="track.coverImgUrl" alt="cover" />
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
    </liquid-card>
    <h1>Ranking</h1>
    <liquid-card class="list-card" border-radius="32px" :no-distortion="true">
      <div class="ranking-row" ref="rankingContainer" @scroll="handleRankingScroll">
        <div class="cover-warpper" v-for="(track, $index) in displayedRankList" :key="'rank-'+$index">
          <router-link :to="{name:'List',params:{listId:`${track.id}`}}">
            <div class="cover">
              <skeleton-image :src="track.coverImgUrl" alt="cover" />
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
    </liquid-card>
  </div>
</template>

<script>
import {getTrendList,getRank} from "../api/neteaseApi"
import SkeletonImage from "../components/SkeletonImage.vue"
import LiquidCard from "../components/LiquidCard.vue"

const PAGE_SIZE = 8;

export default {
  components: {
    SkeletonImage,
    LiquidCard
  },
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
    // 移动端不做卡片内滚动（iOS 嵌套滚动不可靠），一次性渲染全部，
    // 数据本来就是全量拉回后本地 slice 的，放开只影响 DOM 数量
    if (window.innerWidth <= 520) {
      this.trendingDisplayCount = Number.MAX_SAFE_INTEGER;
      this.rankingDisplayCount = Number.MAX_SAFE_INTEGER;
    }
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
  width: 100%;
  max-width: 1480px;
  display: flex;
  flex-direction: column;
}
.list-card {
  margin: auto 0;
  min-height: 300px;
  max-height: 530px;
  /* Fixed height is required for child height:100% and overflow:auto to work correctly */
  height: 530px;
}
.trending-row,
.ranking-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-auto-rows: min-content;
  align-content: start;
  gap: 20px;
  padding: 20px;
  /* margin: auto 0; Moved to .list-card */
  /* min-height: 300px; Moved to .list-card */
  /* max-height: 530px; Moved to .list-card */
  height: 100%; /* Fill the card */
  overflow: hidden auto;
  /* border-radius: 32px; Handled by card */
  /* background-color: rgba(196, 196, 196, 0.3); Removed */
}
.cover-warpper {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  height: auto;
  width: 100%;
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
  width: 100%;
  max-width: 175px;
  padding: 8px 0;
  font-size: 14px;
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
  min-height: 200px;
  padding: 20px;
  color: #666;
  grid-column: 1 / -1; // 占满整行
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
// iPad 横竖屏响应式样式 (768px - 1024px)
@media screen and (min-width: 768px) and (max-width: 1024px) {
  .home-warpper {
    width: 100%;
    padding: 0 10px;
  }
  
  .trending-row,
  .ranking-row {
    height: auto;
    max-height: none;
    justify-content: flex-start;
  }
  
  .cover-warpper {
    width: calc(33.33% - 20px); // 一行3个
    height: 180px;
    margin: 10px;
  }
  
  .cover {
    width: 140px;
    height: 140px;
  }
  
  .name {
    font-size: 13px;
  }
}

// 移动端响应式样式
@media screen and (max-width: 768px) {
  .home-warpper {
    width: 100%;
    padding: 0;
  }
  
  .list-card {
    display: block;
    margin: 10px 0;
    max-height: 400px;
    /* Fixed height is required for child height:100% and overflow:auto to work correctly */
    height: 400px; 
  }

  .trending-row,
  .ranking-row {
    height: 100%;
    /* margin: 10px 0; Moved to list-card */
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

  /* 取消卡片内滚动：高度自适应，整页由 projects-section-content 单一滚动 */
  .list-card {
    height: auto;
    max-height: none;
    border-radius: 16px;
  }

  .trending-row,
  .ranking-row {
    height: auto;
    max-height: none;
    overflow: visible;
    gap: 0;
    padding: 8px 12px;
  }

  /* iOS 列表行：收紧行距，分隔线代替空隙 */
  .cover-warpper {
    height: auto;
    margin: 0;
    padding: 8px 0;
    border-bottom: 0.5px solid rgba(0, 0, 0, 0.05);
  }

  .cover-warpper:last-of-type {
    border-bottom: none;
  }
}
</style>