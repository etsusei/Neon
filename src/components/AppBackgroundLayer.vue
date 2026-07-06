<template>
  <div class="app-background-layer">
    <div class="app-background-layer__idle">
      <background-animation
        ref="idleBackground"
        :no-blur="false"
        v-show="!isDarkMode"
        :style="{
          opacity: isPlaying ? 0 : 1,
          transition: 'opacity 0.8s ease-in-out'
        }"
      />
    </div>

    <new-bg-alternative
      ref="musicBackground"
      v-show="!isDarkMode"
      :visible="isPlaying"
      :cover-image="coverImage"
      :style="{
        opacity: isPlaying ? 1 : 0,
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
  watch: {
    isPlaying() {
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
      if (this.isDarkMode) return;
      if (this.renderSwitchTimer) {
        clearTimeout(this.renderSwitchTimer);
      }
      this.renderSwitchTimer = setTimeout(() => {
        this.applyBackgroundState();
      }, 1000);
    },
    applyBackgroundState() {
      if (document.hidden || this.isDarkMode) {
        this.pauseAll();
        return;
      }

      if (this.isPlaying) {
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
  inset: 0;
  overflow: hidden;
  z-index: -2;
}

.app-background-layer__idle {
  position: fixed;
  inset: 0;
  overflow: hidden;
  z-index: -2;
}
</style>
