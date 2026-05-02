<template>
  <div>
    <template v-if="isLoginPage">
      <router-view />
    </template>

    <template v-else>
      <app-background-layer
        :is-playing="isPlaying"
        :is-dark-mode="isDarkMode"
        :cover-image="currentTrackCover"
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
      dateToday: ''
    };
  },
  computed: {
    ...mapState(["isPlaying", "currentTrackCover", "isImmersiveMode", "isDarkMode"]),
    isLoginPage() {
      return this.$route.name === 'Login';
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
  },
  methods: {
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
