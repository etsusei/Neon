<template>
  <div>
    <template v-if="isStandalonePage">
      <router-view />
    </template>

    <template v-else>
      <app-background-layer
        :is-playing="isPlaying"
        :is-player-expanded="isPlayerExpanded"
        :is-dark-mode="isDarkMode"
        :cover-image="playbackCoverImage"
      />

      <transition name="lyric-fade">
        <div v-if="isImmersiveMode" class="immersive-lyric">
          <lyric-display :immersive="true" />
        </div>
      </transition>

      <app-main-layout
        :is-immersive-mode="isImmersiveMode"
        :is-dark-mode="isDarkMode"
        :date-today="dateToday"
        :display-username="displayUsername"
        @toggle-dark-mode="toggleDarkMode"
      />
    </template>
  </div>
</template>

<script>
import dayjs from "dayjs";
import { mapState } from 'vuex';
import AppBackgroundLayer from "./components/AppBackgroundLayer.vue";
import AppMainLayout from "./components/AppMainLayout.vue";
import LyricDisplay from "./components/LyricDisplay.vue";

export default {
  components: {
    AppBackgroundLayer,
    AppMainLayout,
    LyricDisplay
  },
  data() {
    return {
      dateToday: '',
      removeViewportListeners: null
    };
  },
  computed: {
    ...mapState(["isImmersiveMode", "isDarkMode", "isPlayerExpanded"]),
    isPlaying() {
      return this.$store.state.playback.isPlaying;
    },
    playbackCoverImage() {
      return this.$store.state.playback.coverImage;
    },
    isStandalonePage() {
      // 登录页和管理后台不使用播放器主布局
      return this.$route.name === 'Login' || this.$route.path.startsWith('/admin');
    },
    displayUsername() {
      try {
        const userInfo = localStorage.getItem('user_info');
        if (userInfo) {
          const user = JSON.parse(userInfo);
          return user.username || 'User';
        }
      } catch (error) {
        console.error('Failed to parse user info:', error);
      }
      return 'User';
    }
  },
  mounted() {
    this.dateToday = dayjs().format("YYYY,MMM,DD");
    this.applySavedDarkMode();
    this.initViewportSizing();
  },
  beforeUnmount() {
    if (this.removeViewportListeners) {
      this.removeViewportListeners();
    }
  },
  methods: {
    initViewportSizing() {
      // iOS 主屏 Web App 冷启动时，100vh/100dvh 的首帧值可能滞后。
      // 直接跟随 visualViewport，不再依赖 1px 滚动这种不稳定的视口刷新技巧。
      const syncViewportHeight = () => {
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        document.documentElement.style.setProperty(
          '--app-viewport-height',
          `${Math.round(viewportHeight)}px`
        );
      };

      const visualViewport = window.visualViewport;
      syncViewportHeight();
      window.addEventListener('resize', syncViewportHeight, { passive: true });
      window.addEventListener('orientationchange', syncViewportHeight, { passive: true });
      window.addEventListener('pageshow', syncViewportHeight, { passive: true });
      visualViewport?.addEventListener('resize', syncViewportHeight, { passive: true });

      // WebKit 会在首帧后才校准安全区/可视视口，补两次延迟同步。
      const startupTimers = [
        window.setTimeout(syncViewportHeight, 100),
        window.setTimeout(syncViewportHeight, 500)
      ];

      this.removeViewportListeners = () => {
        startupTimers.forEach(timer => window.clearTimeout(timer));
        window.removeEventListener('resize', syncViewportHeight);
        window.removeEventListener('orientationchange', syncViewportHeight);
        window.removeEventListener('pageshow', syncViewportHeight);
        visualViewport?.removeEventListener('resize', syncViewportHeight);
      };
    },
    applySavedDarkMode() {
      const savedDarkMode = localStorage.getItem('neon_dark_mode');
      if (savedDarkMode === '1' && !this.isDarkMode) {
        this.$store.commit('ToggleDarkMode');
      }
      document.body.classList.toggle('dark-mode-active', this.isDarkMode);
    },
    toggleDarkMode() {
      this.$store.commit('ToggleDarkMode');
      localStorage.setItem('neon_dark_mode', this.isDarkMode ? '1' : '0');
      document.body.classList.toggle('dark-mode-active', this.isDarkMode);
    }
  }
};
</script>

<style lang="scss">
@use "./styles/app.scss";
</style>
