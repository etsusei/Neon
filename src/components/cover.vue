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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-auto-rows: min-content;
  align-content: start;
  gap: 20px;
  padding: 20px;
  width: 100%;
  max-height: 50vh;
  overflow: hidden auto;
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
.cover-warpper {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  height: auto;
  width: 100%;
}
.cover {
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  width: 175px;
  height: 175px;
  border-radius: 20px;
  margin: auto;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}
.cover:hover {
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
/* 加载状态样式 */
.load-more-section {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 200px;
  padding: 20px;
  color: #666;
  grid-column: 1 / -1;
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


/* Mobile Optimization */
@media screen and (max-width: 520px) {
  .cover-container {
    display: flex; /* Switch to flex column */
    flex-direction: column;
    gap: 0;
    padding: 0;
    overflow-x: hidden;
  }

  .cover-warpper {
    display: grid;
    grid-template-columns: 50px 1fr;
    grid-template-rows: auto;
    gap: 0 12px;
    padding: 8px 12px;
    width: 100%;
    height: auto;
    align-items: center;
    border-bottom: 0.5px solid rgba(0,0,0,0.05); /* Divider */
    margin: 0;
  }

  /* Make sure the router-link wrapping the cover allows it to be sized correctly */
  .cover-warpper > a {
    display: block;
    width: 50px;
    height: 50px;
    grid-column: 1;
  }

  .cover {
    width: 100%;
    height: 100%;
    aspect-ratio: 1;
    border-radius: 8px;
    margin: 0;
  }

  .name {
    grid-column: 2;
    text-align: left;
    font-size: 15px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0;
    margin: 0;
    width: 100%;
    max-width: 100%;
  }
}
</style>