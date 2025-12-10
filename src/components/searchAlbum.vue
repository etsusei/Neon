<template>
  <div class="album-search-container" ref="scrollContainer" @scroll="handleScroll">
    <div class="cover-warpper" v-for="(track,$index) in result" :key="$index">
      <router-link :to="{name:'Album',params:{albumId:`${track.id}`}}">
        <div class="cover">
          <skeleton-image :src="track.picUrl" alt="album cover" />
        </div>
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
import SkeletonImage from './SkeletonImage.vue';

export default {
  components: {
    SkeletonImage
  },
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
.album-search-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-auto-rows: min-content;
  align-content: start;
  gap: 20px;
  padding: 20px;
  width: 100%;
  max-height: 60vh;
  overflow: hidden auto;
}
.album-search-container::-webkit-scrollbar {
  width: 8px;
  border-radius: 10px;
}
.album-search-container::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: rgba(121, 121, 121, 0.3);
}
.album-search-container::-webkit-scrollbar-track {
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
  width: 175px;
  height: 175px;
  border-radius: 20px;
  margin: auto;
  cursor: pointer;
  overflow: hidden;
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
.no-more {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 15px;
  font-size: 12px;
  color: #999;
  grid-column: 1 / -1;
}
</style>