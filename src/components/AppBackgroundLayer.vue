<template>
  <div class="app-background-layer">
    <div class="app-background-layer__idle">
      <background-animation
        ref="idleBackground"
        :no-blur="false"
        v-show="!isDarkMode"
        :style="{
          opacity: showMusicBackground ? 0 : 1,
          transition: 'opacity 0.8s ease-in-out'
        }"
      />
    </div>

    <new-bg-alternative
      ref="musicBackground"
      v-show="!isDarkMode || isPlayerExpanded"
      :visible="showMusicBackground"
      :cover-image="coverImage"
      :style="{
        opacity: showMusicBackground ? 1 : 0,
        transition: 'opacity 0.8s ease-in-out'
      }"
    />
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import BackgroundAnimation from './BackgroundAnimation.vue';

export default {
  name: 'AppBackgroundLayer',
  components: {
    BackgroundAnimation,
    // 异步加载：NewBgAlternative 依赖 three.js(~600KB)，同步引入会把它打进首屏主包。
    // 背景是纯装饰，让首屏先渲染内容，three 从独立 chunk 后到。
    NewBgAlternative: defineAsyncComponent(() => import('./NewBgAlternative.vue'))
  },
  props: {
    isPlaying: {
      type: Boolean,
      default: false
    },
    isPlayerExpanded: {
      type: Boolean,
      default: false
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    coverImage: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      renderSwitchTimer: null
    };
  },
  computed: {
    showMusicBackground() {
      return Boolean(this.coverImage) && (this.isPlaying || this.isPlayerExpanded);
    }
  },
  watch: {
    isPlaying() {
      this.scheduleBackgroundSwitch();
    },
    isPlayerExpanded() {
      this.scheduleBackgroundSwitch();
    },
    isDarkMode() {
      this.applyBackgroundState();
    }
  },
  mounted() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.applyBackgroundState();
  },
  beforeUnmount() {
    if (this.renderSwitchTimer) {
      clearTimeout(this.renderSwitchTimer);
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  },
  methods: {
    scheduleBackgroundSwitch() {
      if (this.isDarkMode && !this.isPlayerExpanded) return;
      if (this.renderSwitchTimer) {
        clearTimeout(this.renderSwitchTimer);
      }
      this.renderSwitchTimer = setTimeout(() => {
        this.applyBackgroundState();
      }, 1000);
    },
    applyBackgroundState() {
      if (document.hidden || (this.isDarkMode && !this.isPlayerExpanded)) {
        this.pauseAll();
        return;
      }

      if (this.showMusicBackground) {
        this.$refs.idleBackground?.pauseRendering();
        this.$refs.musicBackground?.resumeRendering();
      } else {
        this.$refs.musicBackground?.pauseRendering();
        this.$refs.idleBackground?.resumeRendering();
      }
    },
    pauseAll() {
      this.$refs.idleBackground?.pauseRendering();
      this.$refs.musicBackground?.pauseRendering();
    },
    handleVisibilityChange() {
      this.applyBackgroundState();
    }
  }
};
</script>

<style scoped>
.app-background-layer {
  position: fixed;
  /* 向四周出血：iOS PWA 冷启动首帧布局视口会算小/偏移（划一下才恢复），
     背景多铺出安全区+余量，黑边期间露出的也是背景色而不是 body 的黑底 */
  top: calc(-1 * env(safe-area-inset-top, 0px) - 80px);
  bottom: calc(-1 * env(safe-area-inset-bottom, 0px) - 120px);
  left: -20px;
  right: -20px;
  overflow: hidden;
  z-index: -2;
}

.app-background-layer__idle {
  /* absolute 跟随出血后的父级（fixed 会重新相对视口定位，失去出血效果） */
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: -2;
}
</style>
