<template>
  <div class="list-search-container" ref="scrollContainer" @scroll="handleScroll">
    <div class="cover-warpper" v-for="(track, $index) in result" :key="$index">
      <router-link :to="{name:'List',params:{listId:`${track.id}`}}">
        <div class="cover" @click="toList">
          <img 
            :src="track.coverImgUrl" 
            referrerpolicy="no-referrer" 
            alt="cover" 
            @error="handleImageError($event, track)"
          />
          <div v-if="track.imageError" class="image-error">Img Err</div>
        </div>
      </router-link>
      <div class="name">{{ track.name }}</div>
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
    toList() {
      // Logic if needed, or rely on router-link
    },
    handleImageError(e, track) {
      track.imageError = true; 
      e.target.style.display = 'none';
      e.target.parentElement.innerText = 'Img Err';
    },
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
  },
};
</script>

<style lang="scss" scoped>
.list-search-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  width: 100%;
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
}
.list-search-container::-webkit-scrollbar {
  width: 8px;
  border-radius: 10px;
}
.list-search-container::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: rgba(121, 121, 121, 0.3);
}
.list-search-container::-webkit-scrollbar-track {
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
  width: 175px;
  height: 175px;
  border-radius: 20px;
  padding: 0 0 0 0;
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
.image-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #333;
  font-size: 14px;
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

// 移动端响应式样式 - 使用行列表显示
@media screen and (max-width: 768px) {
  .list-search-container {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
  }
  
  .cover-warpper {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    height: 60px;
    width: 100%;
    margin: 5px 0;
    padding: 5px 10px;
    border-radius: 10px;
    transition: all 0.3s ease-in-out;
  }
  
  .cover-warpper:hover {
    background-color: rgba(210, 210, 210, 0.4);
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
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>