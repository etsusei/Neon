<template>
  <div class="lyric-container" :class="{ 'dark-mode': lyricDarkMode }" ref="container">
    <div 
      class="lyric-content" 
      ref="content"
      @wheel="handleWheel"
    >
      <div 
        v-for="(line, index) in lyrics" 
        :key="index"
        class="lyric-line"
        :class="{ 
          'active': index === currentLineIndex,
          'near': Math.abs(index - currentLineIndex) === 1,
          'far': Math.abs(index - currentLineIndex) > 1
        }"
        :ref="'line-' + index"
        @click="seekToLine(line)"
      >
        {{ line.text }}
      </div>
    </div>
    <div v-if="!lyrics.length && !loading" class="no-lyric">
      <i class="fa fa-music"></i>
      <span>暂无歌词</span>
    </div>
    <div v-if="loading" class="loading">
      <i class="fa fa-spinner fa-spin"></i>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { getLyric } from '../api/neteaseApi';

export default {
  name: 'LyricDisplay',
  data() {
    return {
      lyrics: [],
      currentLineIndex: -1,
      loading: false,
      userScrolling: false,
      scrollTimer: null
    };
  },
  computed: {
    ...mapState(['tracks', 'currentIndex', 'currentTime', 'isPlaying', 'lyricDarkMode']),
    currentTrack() {
      if (this.tracks && this.currentIndex !== null && this.tracks[this.currentIndex]) {
        return this.tracks[this.currentIndex];
      }
      return null;
    }
  },
  watch: {
    currentTrack: {
      handler(newTrack, oldTrack) {
        if (newTrack && newTrack.id && (!oldTrack || newTrack.id !== oldTrack.id)) {
          this.fetchLyric(newTrack.id);
        }
      },
      immediate: true
    },
    currentTime(time) {
      this.updateCurrentLine(time);
    }
  },
  methods: {
    async fetchLyric(songId) {
      this.lyrics = [];
      this.currentLineIndex = -1;
      this.loading = true;
      
      try {
        const res = await getLyric(songId);
        if (res.data && res.data.lrc && res.data.lrc.lyric) {
          this.lyrics = this.parseLyric(res.data.lrc.lyric);
          // 歌词加载后滚动到顶部
          this.$nextTick(() => {
            if (this.$refs.content) {
              this.$refs.content.scrollTop = 0;
            }
          });
        }
      } catch (e) {
        console.error('获取歌词失败:', e);
      } finally {
        this.loading = false;
      }
    },
    
    parseLyric(lrcText) {
      const lines = lrcText.split('\n');
      const result = [];
      const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
      
      lines.forEach(line => {
        const match = line.match(timeRegex);
        if (match) {
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          const ms = parseInt(match[3].padEnd(3, '0'));
          const time = minutes * 60 + seconds + ms / 1000;
          const text = line.replace(timeRegex, '').trim();
          
          if (text) {
            result.push({ time, text });
          }
        }
      });
      
      return result.sort((a, b) => a.time - b.time);
    },
    
    updateCurrentLine(currentTime) {
      if (!this.lyrics.length) return;
      
      let index = -1;
      for (let i = 0; i < this.lyrics.length; i++) {
        if (this.lyrics[i].time <= currentTime) {
          index = i;
        } else {
          break;
        }
      }
      
      if (index !== this.currentLineIndex) {
        this.currentLineIndex = index;
        // 仅在用户没有手动滚动时自动滚动
        if (!this.userScrolling && index >= 0) {
          this.scrollToLine(index);
        }
      }
    },
    
    scrollToLine(index) {
      this.$nextTick(() => {
        const lineRef = this.$refs['line-' + index];
        if (lineRef && lineRef[0]) {
          lineRef[0].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      });
    },
    
    handleWheel() {
      // 用户手动滚动时，暂停自动滚动3秒
      this.userScrolling = true;
      if (this.scrollTimer) {
        clearTimeout(this.scrollTimer);
      }
      this.scrollTimer = setTimeout(() => {
        this.userScrolling = false;
      }, 3000);
    },
    
    seekToLine(line) {
      // 点击歌词跳转播放 - 通过 Vuex
      this.$store.commit('SetSeekTime', line.time);
    }
  }
};
</script>

<style lang="scss" scoped>
.lyric-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.lyric-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 20px 0 50% 0; // 底部留出50%空间，让最后的歌词也能居中
  scroll-behavior: smooth;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.lyric-line {
  padding: 12px 20px;
  text-align: center;
  font-size: 16px;
  line-height: 1.5;
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgba(0, 0, 0, 0.35);
  
  &:hover {
    color: rgba(0, 0, 0, 0.6);
  }
  
  &.active {
    color: rgba(0, 0, 0, 0.95);
    font-size: 18px;
    font-weight: 600;
  }
  
  &.near {
    color: rgba(0, 0, 0, 0.5);
  }
  
  &.far {
    color: rgba(0, 0, 0, 0.3);
  }
}

.no-lyric {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.4);
  gap: 10px;
  
  i {
    font-size: 48px;
  }
  
  span {
    font-size: 16px;
  }
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  
  i {
    font-size: 32px;
    color: rgba(0, 0, 0, 0.4);
  }
}

/* 深色模式 - 深色背景时使用白色歌词 */
.lyric-container.dark-mode {
  .lyric-line {
    color: rgba(255, 255, 255, 0.3);
    
    &.active {
      color: rgba(255, 255, 255, 0.95);
    }
    
    &.near {
      color: rgba(255, 255, 255, 0.5);
    }
    
    &.far {
      color: rgba(255, 255, 255, 0.2);
    }
    
    &:hover {
      color: rgba(255, 255, 255, 0.7);
    }
  }
  
  .no-lyric {
    color: rgba(255, 255, 255, 0.4);
    
    i {
      color: rgba(255, 255, 255, 0.3);
    }
  }
  
  .loading i {
    color: rgba(255, 255, 255, 0.4);
  }
}
</style>
