<template>
  <transition name="slide-up">
    <div v-if="show" class="playlist-popup-overlay" @click.self="close">
      <div class="playlist-popup">
        <div class="popup-header">
          <span class="popup-title">正在播放</span>
          <span class="popup-count">{{ tracks.length }} 首</span>
          <div class="popup-close" @click="close">
            <i class="fa fa-times"></i>
          </div>
        </div>
        <div class="popup-content">
          <div
            v-for="(track, $index) in tracks"
            :key="$index"
            :class="['popup-item', { 'playing': currentIndex === $index }]"
            @click="playTrack($index)"
          >
            <div class="item-index">
              <i v-if="currentIndex === $index && isPlaying" class="fa fa-volume-up"></i>
              <span v-else>{{ $index + 1 }}</span>
            </div>
            <div
              class="item-cover"
              :style="{ backgroundImage: `url(${track.cover})` }"
            ></div>
            <div class="item-info">
              <div class="item-name" :title="track.name">{{ track.name }}</div>
              <div class="item-artist" :title="track.artist">{{ track.artist }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { mapGetters, mapMutations, mapState } from "vuex";

export default {
  name: 'PlaylistPopup',
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapGetters(["tracks", "currentIndex"]),
    ...mapState(["isPlaying"])
  },
  watch: {
    show(visible) {
      if (visible) {
        // 弹窗打开时滚动到当前播放歌曲
        this.$nextTick(() => {
          this.scrollToCurrentTrack();
        });
      }
    }
  },
  methods: {
    ...mapMutations({
      toPlay: "GetIndex"
    }),
    playTrack(index) {
      this.toPlay(index);
      // 从播放列表播放，非单次模式
      this.$store.commit('SetSinglePlay', false);
    },
    close() {
      this.$emit('close');
    },
    scrollToCurrentTrack() {
      const container = this.$el?.querySelector('.popup-content');
      const currentItem = this.$el?.querySelector('.popup-item.playing');
      if (container && currentItem) {
        // 计算滚动位置使当前歌曲显示在中间
        const containerHeight = container.clientHeight;
        const itemTop = currentItem.offsetTop;
        const itemHeight = currentItem.clientHeight;
        const scrollTo = itemTop - (containerHeight / 2) + (itemHeight / 2);
        container.scrollTop = Math.max(0, scrollTo);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.playlist-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 20px;
  padding-bottom: 85px; // 留出播放器空间
}

.playlist-popup {
  width: 320px;
  max-height: calc(100vh - 200px);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.popup-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  
  .popup-title {
    font-size: 16px;
    font-weight: 600;
  }
  
  .popup-count {
    font-size: 12px;
    color: #666;
    margin-left: 8px;
  }
  
  .popup-close {
    margin-left: auto;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 50%;
    transition: background 0.2s;
    
    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
    
    i {
      font-size: 14px;
      color: #666;
    }
  }
}

.popup-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }
}

.popup-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  
  &.playing {
    background: rgba(246, 0, 46, 0.1);
    
    .item-name {
      color: rgb(246, 0, 46);
    }
    
    .item-index {
      color: rgb(246, 0, 46);
    }
  }
}

.item-index {
  width: 24px;
  font-size: 12px;
  color: #999;
  text-align: center;
  flex-shrink: 0;
}

.item-cover {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
  margin-right: 10px;
}

.item-info {
  flex: 1;
  overflow: hidden;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-artist {
  font-size: 11px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

// 动画 - 淡入淡出
.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}
</style>
