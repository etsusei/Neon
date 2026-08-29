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
import { refreshLocalSession } from './api/http';

const AUTH_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;

export default {
  components: {
    AppBackgroundLayer,
    AppMainLayout,
    LyricDisplay
  },
  data() {
    return {
      dateToday: '',
      authRefreshTimer: null
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
    this.kickStandaloneViewport();
    this.startLocalSessionRefresh();
  },
  beforeUnmount() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.authRefreshTimer) clearInterval(this.authRefreshTimer);
  },
  methods: {
    startLocalSessionRefresh() {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.authRefreshTimer = setInterval(() => {
        if (document.visibilityState === 'visible') this.silentlyRefreshLocalSession();
      }, AUTH_REFRESH_INTERVAL_MS);
    },
    handleVisibilityChange() {
      if (document.visibilityState === 'visible') this.silentlyRefreshLocalSession();
    },
    silentlyRefreshLocalSession() {
      refreshLocalSession().catch(error => {
        // 明确的认证失效由响应拦截器处理；断网/5xx 仅记录，不退出。
        if (!error.response?.data?.auth_code) {
          console.warn('Silent session refresh failed:', error)
        }
      });
    },
    kickStandaloneViewport() {
      // iOS PWA 冷启动首帧视口偏小/偏移（页面上划一下才自愈），
      // 启动后做一次 1px 微滚动促使 WKWebView 立即重算视口
      if (!window.navigator.standalone) return;
      setTimeout(() => {
        window.scrollTo(0, 1);
        window.scrollTo(0, 0);
      }, 80);
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
