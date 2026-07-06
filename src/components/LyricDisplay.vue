<template>
  <div
    class="lyric-container"
    :class="{ immersive, 'dark-mode': immersive && lyricDarkMode }"
    ref="container"
  >
    <div 
      class="lyric-content" 
      ref="content"
      @wheel.stop="handleWheel"
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
        :style="immersive ? lyricLineStyle(index) : null"
        :ref="'line-' + index"
        @click.stop="seekToLine(line)"
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
  props: {
    immersive: {
      type: Boolean,
      default: false
    }
  },
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
    ...mapState({
      tracks: state => state.tracks,
      currentIndex: state => state.playback.currentTrackIndex,
      currentTime: state => state.playback.currentTime,
      isPlaying: state => state.playback.isPlaying,
      lyricDarkMode: state => state.lyricDarkMode
    }),
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

    lyricLineStyle(index) {
      if (this.currentLineIndex < 0) {
        return {
          '--distance-opacity': 0.56,
          '--distance-blur': '0.45px',
          '--distance-scale': 0.98
        };
      }

      const distance = Math.abs(index - this.currentLineIndex);
      const cappedDistance = Math.min(distance, 5);
      const opacityByDistance = [1, 0.7, 0.5, 0.4, 0.34, 0.32];
      const blurByDistance = [0, 0.65, 1.35, 2.15, 2.8, 3.4];
      const scaleByDistance = [1, 0.978, 0.956, 0.936, 0.918, 0.9];

      return {
        '--distance-opacity': opacityByDistance[cappedDistance],
        '--distance-blur': `${blurByDistance[cappedDistance]}px`,
        '--distance-scale': scaleByDistance[cappedDistance]
      };
    },
    
    seekToLine(line) {
      // 点击歌词跳转播放 - 通过 Vuex
      this.$store.commit('SetPlaybackSeekTime', line.time);
    }
  }
};
</script>

<style lang="scss" scoped>
.lyric-container {
  width: 100%;
  height: 100%;
  position: relative;
  --lyric-text: rgba(0, 0, 0, 0.96);
  --lyric-muted: rgba(0, 0, 0, 0.32);
  --lyric-near: rgba(0, 0, 0, 0.58);
  --lyric-hover: rgba(0, 0, 0, 0.72);
  --lyric-shadow: none;
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

.lyric-container.immersive {
  width: min(76vw, 760px);
  max-width: calc(100vw - 32px);
  height: min(84vh, 820px);
  pointer-events: auto;
  --lyric-text: rgba(10, 10, 12, 0.94);
  --lyric-muted: rgba(10, 10, 12, 0.3);
  --lyric-far: rgba(10, 10, 12, 0.18);
  --lyric-near: rgba(10, 10, 12, 0.54);
  --lyric-hover: rgba(10, 10, 12, 0.7);
  --lyric-active-glow:
    0 0 8px rgba(255, 255, 255, 0.16),
    0 10px 24px rgba(0, 0, 0, 0.12);
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Display",
    "SF Pro Text",
    "PingFang SC",
    "Microsoft YaHei",
    sans-serif;

  .lyric-content {
    padding: 28vh 8px 40vh;
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0,
      rgba(0, 0, 0, 0.35) 8%,
      #000 22%,
      #000 74%,
      rgba(0, 0, 0, 0.35) 88%,
      transparent 100%
    );
    mask-image: linear-gradient(
      to bottom,
      transparent 0,
      rgba(0, 0, 0, 0.35) 8%,
      #000 22%,
      #000 74%,
      rgba(0, 0, 0, 0.35) 88%,
      transparent 100%
    );
    scrollbar-width: none;

    &::-webkit-scrollbar {
      width: 0;
    }
  }

  .lyric-line {
    max-width: 760px;
    margin: 0 auto;
    padding: 14px 8px;
    text-align: center;
    color: var(--lyric-muted);
    opacity: var(--distance-opacity, 0.32);
    font-size: clamp(22px, 3vw, 34px);
    font-weight: 760;
    line-height: 1.34;
    letter-spacing: 0;
    text-shadow: var(--lyric-shadow);
    filter: blur(var(--distance-blur, 0.4px));
    transform-origin: center;
    transform: scale(var(--distance-scale, 1));
    transition:
      color 0.28s ease,
      opacity 0.28s ease,
      transform 0.28s ease,
      filter 0.28s ease;

    &:hover {
      color: var(--lyric-hover);
      filter: blur(0);
      transform: scale(1.015);
    }

    &.active {
      color: var(--lyric-text);
      font-size: clamp(25px, 3.35vw, 39px);
      font-weight: 820;
      text-shadow: var(--lyric-active-glow);
      transform: scale(1.025);
      filter: blur(0) saturate(1.12);
      opacity: 1;
    }

    &.near {
      color: var(--lyric-near);
      font-size: clamp(22px, 3vw, 34px);
    }

    &.far {
      color: var(--lyric-far);
      font-size: clamp(21px, 2.75vw, 31px);
    }
  }

  .no-lyric,
  .loading {
    pointer-events: auto;
  }

  .no-lyric {
    color: var(--lyric-near);
    text-shadow: var(--lyric-shadow);

    i {
      color: var(--lyric-muted);
    }
  }

  .loading i {
    color: var(--lyric-near);
    text-shadow: var(--lyric-shadow);
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
  --lyric-text: rgba(255, 255, 255, 0.96);
  --lyric-muted: rgba(255, 255, 255, 0.34);
  --lyric-far: rgba(255, 255, 255, 0.2);
  --lyric-near: rgba(255, 255, 255, 0.6);
  --lyric-hover: rgba(255, 255, 255, 0.78);
  --lyric-shadow:
    0 0 18px rgba(255, 255, 255, 0.12),
    0 12px 34px rgba(0, 0, 0, 0.42);
  --lyric-active-glow:
    0 0 6px rgba(255, 255, 255, 0.24),
    0 0 16px rgba(255, 255, 255, 0.14),
    0 14px 32px rgba(0, 0, 0, 0.42);

  .lyric-line {
    color: var(--lyric-muted);
    
    &.active {
      color: var(--lyric-text);
    }
    
    &.near {
      color: var(--lyric-near);
    }
    
    &.far {
      color: var(--lyric-far);
    }
    
    &:hover {
      color: var(--lyric-hover);
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
