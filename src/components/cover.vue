<template>
  <div class="cover-container" ref="scrollContainer" @scroll="handleScroll">
    <div class="cover-warpper" v-for="(track,$index) in displayedCovers" :key="$index">
      <router-link :to="{name:'Album',params:{albumId:`${track.id}`}}">
        <div class="cover" :style="{ backgroundImage:`url(${track.picUrl})`}"></div>
      </router-link>
      <div class="name">{{track.name}}</div>
    </div>
    <!-- 加载状态 -->
    <div class="load-more-section" v-if="hasMore">
      <div v-if="loading" class="loading-spinner">
        <i class="fa fa-spinner fa-spin"></i>
        <span>加载中...</span>
      </div>
      <div v-else class="load-more-hint">
        <span>滚动加载更多</span>
      </div>
    </div>
    <div v-if="!hasMore && displayedCovers.length > 0" class="no-more">
      <span>没有更多了</span>
    </div>
  </div>
</template>

<script>
const PAGE_SIZE = 12;

export default {
  props:['cover'],
  data() {
    return {
      displayCount: PAGE_SIZE,
      loading: false
    };
  },
  computed: {
    displayedCovers() {
      if (!this.cover) return [];
      return this.cover.slice(0, this.displayCount);
    },
    hasMore() {
      if (!this.cover) return false;
      return this.displayCount < this.cover.length;
    }
  },
  watch: {
    cover() {
      // 当cover变化时重置显示数量
      this.displayCount = PAGE_SIZE;
    }
  },
  methods: {
    handleScroll(e) {
      const container = e.target;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      if (scrollHeight - scrollTop - clientHeight < 100) {
        if (!this.loading && this.hasMore) {
          this.loadMore();
        }
      }
    },
    loadMore() {
      this.loading = true;
      setTimeout(() => {
        this.displayCount += PAGE_SIZE;
        this.loading = false;
      }, 300);
    }
  }
};
</script>

<style lang="scss" scoped>
.cover-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  width: 100%;
  max-height: 50vh;
  overflow-y: auto;
  overflow-x: hidden;
}
.cover-container::-webkit-scrollbar {
  width: 8px;
  border-radius: 10px;
}
.cover-container::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: rgba(121, 121, 121, 0.3);
}
.cover-container::-webkit-scrollbar-track {
  border-radius: 10px;
}
.cover-warpper{
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 200px;
  width:200px;
  margin: 30px 37px;
}
.cover {
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  width: 175px;
  height: 175px;
  border-radius: 20px;
  padding:0 0 0 0;
  margin:auto;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}
.cover:hover{
  width:185px;
  height: 185px;
}
.name {
  text-align: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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
.load-more-hint {
  font-size: 12px;
  color: #999;
}
.no-more {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 15px;
  font-size: 12px;
  color: #999;
}
</style>