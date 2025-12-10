<template>
  <div class="artist-search-container" ref="scrollContainer" @scroll="handleScroll">
    <div class="cover-warpper" v-for="(track,$index) in result" :key="$index">
      <router-link :to="{name:'Artist',params:{artistId:`${track.id}`}}">
        <div class="cover" :style="{ backgroundImage:`url(${track.picUrl})`}"></div>
      </router-link>
      <div class="name">{{track.name}}</div>
    </div>
    <!-- 加载状态 -->
    <div class="load-more-section" v-if="loading || hasMore">
      <div v-if="loading" class="loading-spinner">
        <i class="fa fa-spinner fa-spin"></i>
        <span>加载中...</span>
      </div>
      <div v-else-if="hasMore" class="load-more-hint">
        <span>滚动加载更多</span>
      </div>
    </div>
    <div v-if="!hasMore && result && result.length > 0" class="no-more">
      <span>没有更多了</span>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    result: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    hasMore: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {};
  },
  methods: {
    handleScroll(e) {
      const container = e.target;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      if (scrollHeight - scrollTop - clientHeight < 100) {
        if (!this.loading && this.hasMore) {
          this.$emit('load-more');
        }
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.artist-search-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  width: 100%;
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
}
.artist-search-container::-webkit-scrollbar {
  width: 8px;
  border-radius: 10px;
}
.artist-search-container::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: rgba(121, 121, 121, 0.3);
}
.artist-search-container::-webkit-scrollbar-track {
  border-radius: 10px;
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
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  width: 175px;
  height: 175px;
  border-radius: 50%;
  padding: 0 0 0 0;
  margin: auto;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}
.cover:hover {
  width: 185px;
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

// iPad 响应式布局 (768px - 1024px)
@media screen and (min-width: 768px) and (max-width: 1024px) {
  .cover-warpper {
    width: calc(33.33% - 20px);
    height: 180px;
    margin: 10px;
  }
  
  .cover {
    width: 140px;
    height: 140px;
  }
  
  .cover:hover {
    width: 145px;
    height: 145px;
  }
  
  .name {
    font-size: 13px;
  }
}
</style>