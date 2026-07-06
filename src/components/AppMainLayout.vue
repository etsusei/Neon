<template>
  <div class="app-container" :class="{ 'immersive-mode': isImmersiveMode, 'dark-mode': isDarkMode }">
    <div
      class="app-header"
      :style="{
        opacity: isImmersiveMode ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: isImmersiveMode ? 'none' : 'auto'
      }"
    >
      <div class="app-header-left">
        <i class="fa fa-music" style="font-size: 24px"></i>
        <p class="app-name">Neon</p>
        <div class="search-wrapper">
          <liquid-card border-radius="20px">
            <div class="search-inner">
              <input
                class="search-input"
                v-model="search"
                type="text"
                placeholder="Search"
                @keyup.enter="searchClick"
              />
              <svg
                @click="searchClick"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                class="feather feather-search"
                viewBox="0 0 24 24"
              >
                <defs></defs>
                <circle cx="11" cy="11" r="8"></circle>
                <path d="M21 21l-4.35-4.35"></path>
              </svg>
            </div>
          </liquid-card>
        </div>
      </div>

      <div class="app-header-right">
        <button class="dark-mode-toggle" @click="$emit('toggle-dark-mode')" title="Toggle dark mode">
          <i class="fa" :class="isDarkMode ? 'fa-sun-o' : 'fa-moon-o'"></i>
        </button>
        <router-link :to="{ name: 'Settings' }" class="profile-btn">
          <img
            src="https://img0.baidu.com/it/u=3522288622,363838562&fm=253&fmt=auto&app=138&f=JPEG?w=537&h=269"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            alt="Profile"
          />
          <span>{{ displayUsername }}</span>
        </router-link>
      </div>
    </div>

    <div
      class="app-content"
      :style="{
        opacity: isImmersiveMode ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: isImmersiveMode ? 'none' : 'auto'
      }"
    >
      <div class="app-sidebar">
        <router-link :to="{ name: 'Home' }">
          <p class="app-sidebar-link">
            <i class="fa fa-home" style="font-size: 24px"></i>
          </p>
        </router-link>
        <router-link :to="{ name: 'MyPlaylists' }" class="app-sidebar-link">
          <i class="fa fa-heart" style="font-size: 24px"></i>
        </router-link>
        <div class="back-warpper">
          <div class="back-warpper">
            <liquid-card class="liquid-back" @click="safeGoBack" :hover-effect="true">
              <div class="liquid-back-content">
                <i class="fa fa-angle-left"></i>
              </div>
            </liquid-card>
          </div>
        </div>
      </div>

      <div class="projects-section">
        <liquid-card border-radius="32px">
          <div class="projects-section-content">
            <div class="projects-section-header">
              <p>{{ $route.name }}</p>
              <p class="time">{{ dateToday }}</p>
            </div>
            <div class="projects-section-pages">
              <transition name="fade">
                <router-view></router-view>
              </transition>
            </div>
          </div>
        </liquid-card>
      </div>

      <div class="messages-section">
        <liquid-card border-radius="30px">
          <div class="messages-section-content">
            <div class="projects-section-header">
              <p>Lyrics</p>
            </div>
            <div class="messages">
              <lyric-display />
            </div>
          </div>
        </liquid-card>
      </div>
    </div>

    <music-player />
  </div>
</template>

<script>
import MusicPlayer from './MusicPlayer.vue';
import LyricDisplay from './LyricDisplay.vue';
import LiquidCard from './LiquidCard.vue';

export default {
  name: 'AppMainLayout',
  components: {
    MusicPlayer,
    LyricDisplay,
    LiquidCard
  },
  props: {
    isImmersiveMode: {
      type: Boolean,
      default: false
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    dateToday: {
      type: String,
      default: ''
    },
    displayUsername: {
      type: String,
      default: 'User'
    }
  },
  emits: ['toggle-dark-mode'],
  data() {
    return {
      search: ''
    };
  },
  methods: {
    searchClick() {
      if (!this.search) return;
      this.$router.push({ name: 'Search', params: { keyword: this.search } });
    },
    safeGoBack() {
      if (this.$route.name === 'Home') return;
      if (window.history.length <= 1) {
        this.$router.push({ name: 'Home' });
      } else {
        this.$router.back();
      }
    }
  }
};
</script>
