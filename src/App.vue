<template>
  <div>
    <!-- 登录页面：全屏显示，不显示主界面 -->
    <template v-if="isLoginPage">
      <router-view></router-view>
    </template>
    
    <!-- 主界面：仅登录后显示 -->
    <template v-else>
      <!-- 静态背景 - 始终渲染，通过opacity控制显示 -->
      <div style="position: fixed; inset: 0; overflow: hidden; z-index: -2;">
        <background-animation 
          ref="backgroundAnimation"
          :no-blur="false"
          v-show="!isDarkMode"
          :style="{ 
            opacity: isPlaying ? 0 : 1,
            transition: 'opacity 0.8s ease-in-out'
          }" 
        />
      </div>
      <!-- 动态背景 - 始终渲染，通过opacity控制显示 -->
      <dynamic-background 
        ref="dynamicBackground"
        v-show="!isDarkMode"
        :visible="isPlaying" 
        :coverImage="currentCover"
        :style="{ 
          opacity: isPlaying ? 1 : 0,
          transition: 'opacity 0.8s ease-in-out'
        }"
      />
      <!-- 沉浸式模式下的歌词显示 -->
      <transition name="lyric-fade">
        <div v-if="isImmersiveMode" class="immersive-lyric">
          <lyric-display :immersive="true" />
        </div>
      </transition>
      <div class="app-container" :class="{ 'immersive-mode': isImmersiveMode, 'dark-mode': isDarkMode }">
        <div class="app-header" :style="{ opacity: isImmersiveMode ? 0 : 1, transition: 'opacity 0.5s ease', pointerEvents: isImmersiveMode ? 'none' : 'auto' }">
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
            <button class="dark-mode-toggle" @click="toggleDarkMode" title="切换深色模式">
              <i class="fa" :class="isDarkMode ? 'fa-sun-o' : 'fa-moon-o'"></i>
            </button>
            <router-link :to="{ name: 'Settings' }" class="profile-btn">
              <img
                src="https://img0.baidu.com/it/u=3522288622,363838562&fm=253&fmt=auto&app=138&f=JPEG?w=537&h=269"
              />
              <span>{{ displayUsername }}</span>
            </router-link>
          </div>
        </div>
        <div class="app-content" :style="{ opacity: isImmersiveMode ? 0 : 1, transition: 'opacity 0.5s ease', pointerEvents: isImmersiveMode ? 'none' : 'auto' }">
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
                  <p>{{ this.$route.name }}</p>
                  <p class="time">{{ this.dateToday }}</p>
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
  </div>
</template>

<script>
import dayjs from "dayjs";
import MusicPlayer from "../src/components/MusicPlayer.vue";
import BackgroundAnimation from "../src/components/BackgroundAnimation.vue";
import DynamicBackground from "../src/components/DynamicBackground.vue";
import LyricDisplay from "../src/components/LyricDisplay.vue";
import LiquidCard from "../src/components/LiquidCard.vue";
import { mapGetters, mapState } from 'vuex';

export default {
  components: {
    MusicPlayer,
    BackgroundAnimation,
    DynamicBackground,
    LyricDisplay,
    LiquidCard
  },
  data() {
    return {
      search: "",
      day: "",
      dayjs: null,
      dateToday: new Date(),
      currentCover: '',
      renderSwitchTimer: null // 渲染切换定时器
    };
  },
  computed: {
    ...mapState(["tracks", "index", "nowPlay", "isPlaying", "currentTrackCover", "isImmersiveMode", "isDarkMode"]),
    ...mapGetters([]),
    // 判断当前是否为登录页面
    isLoginPage() {
      return this.$route.name === 'Login';
    },
    // 获取显示的用户名
    displayUsername() {
      try {
        const userInfo = localStorage.getItem('user_info');
        if (userInfo) {
          const user = JSON.parse(userInfo);
          return user.username || '用户';
        }
      } catch (e) {
        console.error('解析用户信息失败:', e);
      }
      return '用户';
    }
  },
  watch: {
    tracks: {
      handler(newTracks) {
        console.log('[App.vue] tracks changed:', newTracks);
      },
      immediate: true
    },
    currentTrackCover: {
      handler(newCover, oldCover) {
        console.log('[App.vue] ===== currentTrackCover changed from Vuex =====');
        console.log('[App.vue] Old cover:', oldCover);
        console.log('[App.vue] New cover:', newCover);
        // Update local currentCover when Vuex state changes (triggered by audio playing)
        if (newCover && newCover !== oldCover) {
          this.currentCover = newCover;
          console.log('[App.vue] ✓ Updated currentCover for DynamicBackground');
        }
      },
      immediate: true
    },
    isPlaying(newVal) {
      console.log('[App.vue] isPlaying changed from Vuex:', newVal);
      console.log('[App.vue] Current cover:', this.currentCover);
      
      // 如果在暗色模式下，不进行任何渲染切换，保持暂停
      if (this.isDarkMode) return;

      // 清除之前的延迟器
      if (this.renderSwitchTimer) {
        clearTimeout(this.renderSwitchTimer);
      }
      
      // 延迟1秒切换渲染
      this.renderSwitchTimer = setTimeout(() => {
        if (newVal) {
          // 播放中：暂停待机背景渲染，恢复动态背景渲染
          console.log('[App.vue] Pausing idle background, resuming dynamic background');
          this.$refs.backgroundAnimation?.pauseRendering();
          this.$refs.dynamicBackground?.resumeRendering();
        } else {
          // 停止：暂停动态背景渲染，恢复待机背景渲染
          console.log('[App.vue] Pausing dynamic background, resuming idle background');
          this.$refs.dynamicBackground?.pauseRendering();
          this.$refs.backgroundAnimation?.resumeRendering();
        }
      }, 1000);
    },
    isDarkMode(newVal) {
      if (newVal) {
        // 进入暗色模式：暂停所有背景渲染
        console.log('[App.vue] Dark Mode ON - pausing all backgrounds');
        this.$refs.backgroundAnimation?.pauseRendering();
        this.$refs.dynamicBackground?.pauseRendering();
        // Body background transition handled by CSS class toggle in methods
      } else {
        // 退出暗色模式：根据播放状态恢复
        console.log('[App.vue] Dark Mode OFF - resuming appropriate background');
        if (this.isPlaying) {
          this.$refs.dynamicBackground?.resumeRendering();
        } else {
          this.$refs.backgroundAnimation?.resumeRendering();
        }
      }
    }
  },
  methods: {
    toggleDarkMode() {
      this.$store.commit('ToggleDarkMode');
      // Persist to localStorage
      localStorage.setItem('neon_dark_mode', this.isDarkMode ? '1' : '0');
      if (this.isDarkMode) {
        document.body.classList.add('dark-mode-active');
      } else {
        document.body.classList.remove('dark-mode-active');
      }
    },
    searchClick() {
      this.$router.push({ name: "Search", params: { keyword: this.search } });
    },
    exitImmersiveMode() {
      this.$store.commit('ToggleImmersiveMode');
    },
    safeGoBack() {
      // 检查浏览器历史记录长度
      // history.length > 1 通常意味着有上一页
      // 但在某些单页应用重载场景下也不一定准确，所以结合当前路由判断
      
      const currentRoute = this.$route.name;
      
      // 如果已经在首页，可以不做操作或者提示
      if (currentRoute === 'Home') {
        return;
      }
      
      // 如果没有历史记录（直接打开的新标签页或者强制刷新），回退可能会退出
      // 这里的 1 是个经验值，新标签页打开通常为 1 或 2，取决于浏览器实现
      if (window.history.length <= 1) {
        this.$router.push({ name: 'Home' });
      } else {
        // 尝试回退
        this.$router.back();
      }
    }
  },
  created() {},
  mounted() {
    this.dayjs = require("dayjs");
    this.dateToday = dayjs().format("YYYY,MMM,DD");
    
    console.log('[App.vue] mounted - using Vuex isPlaying state');
    
    // Load saved dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('neon_dark_mode');
    if (savedDarkMode === '1') {
      // Apply dark mode on load
      this.$store.commit('ToggleDarkMode'); // Set to true (assuming default is false)
      document.body.classList.add('dark-mode-active');
    }
    
    // Page Visibility API - 页面不可见时暂停背景渲染
    this.handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[App.vue] Page hidden - pausing all background rendering');
        this.$refs.backgroundAnimation?.pauseRendering();
        this.$refs.dynamicBackground?.pauseRendering();
      } else {
        console.log('[App.vue] Page visible - resuming appropriate background');
        // 如果在暗色模式下，不恢复背景渲染
        if (this.isDarkMode) return;
        // 根据当前播放状态恢复相应的背景
        if (this.isPlaying) {
          this.$refs.dynamicBackground?.resumeRendering();
        } else {
          this.$refs.backgroundAnimation?.resumeRendering();
        }
      }
    };
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  },
  beforeUnmount() {
    // 清理定时器
    if (this.renderSwitchTimer) {
      clearTimeout(this.renderSwitchTimer);
    }
    // 移除 visibility 监听
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
};
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  width: 100%;
}
html,
body {
  height: 100%;
  margin: 0;
}
a {
  text-decoration: none;
}
* {
  box-sizing: border-box;
}

:root {
  --app-container: transparent; /* transparent for liquid glass */
  --main-color: #1f1c2e;
  --secondary-color: #4a4a4a;
  --link-color: #1f1c2e;
  --link-color-hover: #c3cff4;
  --link-color-active: #fff;
  --link-color-active-bg: #1f1c2e;
  --projects-section: #fff;
  --message-box-hover: #fafcff;
  --message-box-border: #e9ebf0;
  --more-list-bg: #fff;
  --more-list-bg-hover: #f6fbff;
  --more-list-shadow: rgba(209, 209, 209, 0.4);
  --button-bg: #1f1c24;
  --search-area-bg: #fff;
  --star: #1ff1c2e;
  --message-btn: #fff;
  
  /* Text Colors Variables */
  --text-primary: #2c3e50;
  --text-secondary: #666;
}

/* Dark Mode Overrides */
body.dark-mode-active {
  background-color: #000000 !important;
}
.app-container.dark-mode {
  background-color: transparent !important;
  --main-color: #e0e0e0; /* Softer white */
  --secondary-color: #a0a0a0;
  --link-color: #e0e0e0;
  --link-color-active: #171717;
  --link-color-active-bg: #e0e0e0;
  
  /* Update Text Variables for Dark Mode */
  --text-primary: #e0e0e0;   /* Softer white instead of pure white */
  --text-secondary: #a0a0a0; /* Dimmer gray for secondary text */
  
  /* Override text color globally inside dark mode */
  color: var(--text-primary);

  .projects-section-header p,
  .message-header .name,
  .app-name,
  .profile-btn span,
  .app-sidebar-link:not(:hover),
  .app-sidebar-link i,
  .liquid-back-content,
  .liquid-back-content i,
  .search-input {
    color: var(--text-primary) !important;
    transition: color 0.5s ease;
  }
  
  
  /* Make sure links handle hover in dark mode */
  .app-sidebar-link:hover {
    color: #fff; /* White on hover for better visibility on dark card */
  }
  
  /* Ensure active link icon is dark (contrast against white background) */
  .app-sidebar-link.router-link-active i,
  a.router-link-active .app-sidebar-link i {
    color: #171717 !important;
  }
  
  /* Change Liquid Cards to #171717 in dark mode */
  .liquid-card-tint {
    background-color: #171717 !important;
  }
  
  /* Optionally reduce the shine/border effect if it's too bright */
  .liquid-card-shine {
    box-shadow: inset 2px 2px 1px 0 rgba(255, 255, 255, 0.1),
                inset -1px -1px 1px 1px rgba(255, 255, 255, 0.1) !important;
  }
  
  /* Lyrics Overrides */
  .lyric-line {
    color: rgba(255, 255, 255, 0.35) !important;
  }
  .lyric-line:hover {
    color: rgba(255, 255, 255, 0.8) !important;
  }
  .lyric-line.active {
    color: rgba(255, 255, 255, 1) !important;
  }
  .lyric-line.near {
    color: rgba(255, 255, 255, 0.6) !important;
  }
  .lyric-line.far {
    color: rgba(255, 255, 255, 0.35) !important;
  }
  
  .no-lyric, .loading i {
    color: rgba(255, 255, 255, 0.5) !important;
  }
  
  /* Music Player Overrides */
  .musicplayer .track-control {
    background-color: #171717 !important;
    transition: background-color 0.5s ease;
  }
  
  .musicplayer .album-right_name,
  .musicplayer .album-right_info,
  .musicplayer .track-control_icon,
  .musicplayer .track-control_icon i,
  .musicplayer .track-control_iconPlay i,
  .musicplayer .progress_time,
  .musicplayer .progress_duration,
  .musicplayer .volume-control_speaker i,
  .musicplayer .playlist-btn i,
  /* Add global icon overrides */
  .fa-plus,
  .fa-download,
  .fa-file-audio-o,
  .fa-share-alt,
  .fa-heart,
  .fa-trash,
  .project-box-header span,
  .project-box-content-header p,
  .box-content-header,
  .box-content-subheader,
  .playlist-name,
  .playlist-count {
    color: var(--text-primary) !important;
    transition: color 0.5s ease;
  }
  
  /* Volume Bar bg */
  .musicplayer .volume-control_bar .bar {
    background: rgba(255,255,255,0.2) !important;
  }
  
  /* Element Tabs Overrides for Dark Mode */
  .el-tabs__nav-scroll {
    background-color: transparent !important;
  }
  .el-tabs__header {
    border-bottom: none !important;
    background-color: transparent !important;
  }
  .el-tabs--border-card {
    background: transparent !important;
    border: none !important;
  }
  .el-tabs__item {
    color: var(--text-primary) !important;
    transition: color 0.3s ease;
  }
  .el-tabs__item.is-active {
    color: #fff !important;
    font-weight: bold;
    background-color: rgba(255, 255, 255, 0.1) !important;
    border-right-color: transparent !important;
    border-left-color: transparent !important;
  }
  .el-tabs__nav-wrap::after {
    background-color: transparent !important;
  }
}

/* 沉浸式模式歌词 */
.immersive-lyric {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 65px; // 播放器高度
  z-index: 3; // 低于播放器(5)，高于背景
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none; // 不拦截点击事件
  
  :deep(.lyric-container) {
    width: 80%;
    max-width: 800px;
    height: 70%;
    pointer-events: auto; // 仅歌词可点击
  }
  
  :deep(.lyric-line) {
    color: rgba(255, 255, 255, 0.3);
    font-size: 24px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    
    &:hover {
      color: rgba(255, 255, 255, 0.6);
    }
    
    &.active {
      color: rgba(255, 255, 255, 0.95);
      font-size: 32px;
    }
    
    &.near {
      color: rgba(255, 255, 255, 0.5);
      font-size: 22px;
    }
    
    &.far {
      color: rgba(255, 255, 255, 0.2);
      font-size: 20px;
    }
  }
  
  :deep(.no-lyric) {
    color: rgba(255, 255, 255, 0.5);
    
    i {
      color: rgba(255, 255, 255, 0.4);
    }
  }
  
  :deep(.loading i) {
    color: rgba(255, 255, 255, 0.4);
  }
}

/* 沉浸模式歌词淡入淡出动画 */
.lyric-fade-enter-active,
.lyric-fade-leave-active {
  transition: opacity 0.5s ease;
}

.lyric-fade-enter-from,
.lyric-fade-leave-to {
  opacity: 0;
}

.fade-enter {
  opacity: 0;
}
.fade-leave {
  opacity: 1;
}
.fade-enter-active {
  transition: opacity 2s;
}
.fade-leave-active {
  opacity: 0;
  transition: opacity 2s;
}
html,
body {
  width: 100%;
  //height: 100vh;
  margin: 0;
}

body {
  font-family: "DM Sans", sans-serif;
  display: flex;
  justify-content: center;
  background-color: #000;
  background-repeat: no-repeat;
  transition: background-color 0.5s ease; /* Smooth background transition */
}

.app {
  &-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--app-container);
    background: none !important; /* Force transparent */
    /* transition: 0.2s; Stacking context fix */
    transition: background-color 0.5s ease, color 0.5s ease; /* Smooth transition */
    max-width: 1800px;
    margin: auto;
    button,
    input,
    optgroup,
    select,
    textarea {
      font-family: "DM Sans", sans-serif;
    }
  }

  &-content {
    display: flex;
    height: 100%;
    /* overflow: hidden; Removed for debug */
    padding: 16px 24px 24px 0;
    padding: 16px 24px 24px 0;
    /* transition: opacity 0.8s ease-in-out; Stacking context fix */
    position: relative;
    position: relative;
    /* z-index: 2; Removed for debug */
  }

  &-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 16px 24px;
    position: relative;
    transition: opacity 0.8s ease-in-out;

    &-left,
    &-right {
      display: flex;
      align-items: center;
    }

    &-left {
      flex-grow: 1;
    }

    &-right button {
      margin-left: 10px;
    }
  }

  &-icon {
    width: 26px;
    height: 2px;
    border-radius: 4px;
    background-color: var(--main-color);
    position: relative;

    &:before,
    &:after {
      content: "";
      position: absolute;
      width: 12px;
      height: 2px;
      border-radius: 4px;
      background-color: var(--main-color);
      left: 50%;
      transform: translatex(-50%);
    }

    &:before {
      top: -6px;
    }
    &:after {
      bottom: -6px;
    }
  }

  &-name {
    color: var(--main-color);
    margin: 0;
    font-size: 20px;
    line-height: 24px;
    font-weight: 700;
    margin: 0 32px;
  }
}

.search-wrapper {
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  color: var(--light-font);
  /* box-shadow removed for liquid effect */
  overflow: visible; /* Allow liquid card to handle overflow if needed, or keep hidden */
  height: 40px; /* Restore fixed height */

  .search-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 100%;
    padding-right: 12px;
  }

  .dark & {
    box-shadow: none;
  }
}

.search-input {
  border: none;
  flex: 1;
  outline: none;
  height: 100%;
  padding: 0 20px;
  font-size: 16px;
  background-color: rgba(255, 255, 255, 0);
  color: var(--main-color);

  &:placeholder {
    color: var(--main-color);
    opacity: 0.6;
  }
}

.profile-btn {
  padding: 0;
  border: 0;
  background-color: transparent;
  display: flex;
  align-items: center;
  padding-left: 12px;
  border-left: 2px solid #ddd;

  img {
    width: 32px;
    height: 32px;
    object-fit: cover;
    border-radius: 50%;
    margin-right: 4px;
  }

  span {
    color: var(--main-color);
    font-size: 16px;
    line-height: 24px;
    font-weight: 700;
  }
}

.dark-mode-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  color: var(--main-color);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(0,0,0,0.1);
  }
  
  .dark-mode & {
    color: white;
    &:hover {
      background: rgba(255,255,255,0.1);
    }
  }
}

.app-sidebar {
  background: none !important; /* Force transparent */
  /* backdrop-filter: blur(10px); Removed debug */
  padding: 40px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;

  &-link {
    color: var(--main-color);
    color: var(--link-color);
    margin: 16px 0;
    transition: 0.2s;
    border-radius: 50%;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;

    &:hover {
      background-color: var(--link-color-hover);
      color: var(--link-color-active);
    }

    &.router-link-active.router-link-exact-active {
      background-color: var(--link-color-active-bg);
      color: var(--link-color-active);
    }
  }
}
a.router-link-active.router-link-exact-active {
  .app-sidebar-link{
      background-color: var(--link-color-active-bg);
      color: var(--link-color-active);
  }
}
.back-warpper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Liquid Glass Back 按钮 - 样式已移动到文件末尾的纯 CSS 块 */
.projects-section {
  flex: 2;
  /* background-color: var(--projects-section); */
  /* background-color: rgba(255, 255, 255, 0.7); Removed for liquid effect */
  border-radius: 32px;
  /* padding: 32px 32px 0 32px; Moved to content wrapper */
  overflow: hidden;
  overflow: hidden;
  height: calc(100vh - 200px); // Lifted bottom edge slightly (was 180px)
  display: flex;
  display: flex;
  flex-direction: column;
  position: relative;
  /* overflow: auto; Moved to content wrapper */
  transition: all 300ms cubic-bezier(0.19, 1, 0.56, 1);
  
  .projects-section-content {
    padding: 32px 32px 0 32px;
    height: 100%;
    overflow: auto;
    display: flex;
    flex-direction: column;
  }

  &-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 32px;
  }

  &-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    color: var(--main-color);

    p {
      font-size: 24px;
      line-height: 32px;
      font-weight: 700;
      opacity: 0.9;
      margin: 0;
      color: var(--main-color);
    }

    .time {
      font-size: 20px;
    }
  }

  &-pages {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    color: var(--main-color);
    border-radius: 32px;
    //margin: 325px 750px;
  }
}
.projects-section-content::-webkit-scrollbar {
  width: 8px;
  border-radius: 10px;
  background: transparent;
}
.projects-section-content::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: rgba(121, 121, 121, 0.3);
  cursor: pointer;
}
.projects-section-content::-webkit-scrollbar-track {
  border-radius: 10px;
  cursor: pointer;
  background: transparent;
}

.messages-section {
  flex-shrink: 0;
  flex-shrink: 0;
  /* padding-bottom: 32px; Removed to align with projects-section */
  /* background-color: var(--projects-section); */
  /* background-color: rgba(255, 255, 255, 0.7); Removed for liquid effect */
  margin-left: 24px;
  max-width: 200px;
  //flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  justify-content: flex-start;
  width: 100%;
  height: calc(100vh - 200px); // Lifted bottom edge slightly (was 180px)
  //height:400px;
  //height:400px;
  border-radius: 30px;
  border-radius: 30px;
  position: relative;
  /* overflow: auto; Moved to content wrapper */
  transition: all 300ms cubic-bezier(0.19, 1, 0.56, 1);

  .messages-section-content {
    height: 100%;
    overflow: auto;
    display: flex;
    flex-direction: column;
    padding: 16px; /* Added internal padding */
  }

  .projects-section-header {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 32px 24px 0 15px;
    //background-color: var(--projects-section);
  }
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  .name {
    font-size: 16px;
    line-height: 24px;
    font-weight: 700;
    color: var(--main-color);
    margin: 0;
  }
}

.messages {
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
}
.messages-section-content::-webkit-scrollbar {
  width: 8px;
  border-radius: 10px;
  background: transparent;
}
.messages-section-content::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: rgba(121, 121, 121, 0.3);
}
.messages-section-content::-webkit-scrollbar-track {
  border-radius: 10px;
  background: transparent;
}

// iPad 横屏 (宽度 > 高度 且 触摸设备)
@media screen and (min-width: 768px) and (max-width: 1366px) and (orientation: landscape) {
  .app-content {
    padding-bottom: 100px; // 为底部播放器留出更多空间
  }
  
  .projects-section {
    height: calc(100vh - 200px); // 增加播放器区域的间距
    margin-bottom: 20px;
  }
  
  .messages-section {
    height: calc(100vh - 200px);
    margin-bottom: 20px;
  }
}

// iPad 竖屏 (portrait 方向)
@media screen and (min-width: 768px) and (max-width: 1024px) and (orientation: portrait) {
  .messages-section {
    display: none; // 竖屏时隐藏歌词区域
  }
  
  .app-sidebar {
    display: none; // 隐藏侧边栏
  }
  
  .app-content {
    padding: 16px 16px 100px 16px; // 底部留出播放器空间
  }
  
  .projects-section {
    flex: 1;
    max-width: 100%;
    height: calc(100vh - 200px); // 为 header 和播放器留出空间
    margin-bottom: 20px;
  }
}

// 平板设备及以下 (768px)
@media screen and (max-width: 768px) {
  .app-sidebar {
    display: none; // 隐藏侧边栏导航
  }
  
  .messages-section {
    display: none; // 隐藏播放列表面板
  }
  
  .app-content {
    padding: 8px 8px 24px 8px;
  }
  
  .projects-section {
    margin-left: 0;
    max-width: 100%;
    width: 100%;
    height: calc(100vh - 180px); // 为header和播放器留出空间
    padding: 20px;
  }
  
  .app-header {
    padding: 12px;
  }
  
  .search-wrapper {
    max-width: 100%;
    flex: 1;
  }
  
  .app-name {
    margin: 0 16px;
  }
}

// 手机设备 (520px及以下)  
@media screen and (max-width: 520px) {
  .app-header {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
  
  .app-header-left {
    width: 100%;
    justify-content: space-between;
  }
  
  .app-header-right {
    width: 100%;
    justify-content: flex-end;
    display: none; // 隐藏用户头像以节省空间
  }
  
  .app-name {
    display: none; // 在小屏幕隐藏应用名称以节省空间
  }
  
  .profile-btn {
    padding-left: 8px;
    border-left: 1px solid #ddd;
    span {
      display: none;
    }
  }
  
  .search-wrapper {
    max-width: calc(100% - 80px); // 为图标留空间
  }
  
  .projects-section {
    padding: 16px 12px;
    border-radius: 20px;
    height: calc(100vh - 200px);
  }
  
  .projects-section-header {
    margin-bottom: 16px;
    
    p {
      font-size: 20px;
      line-height: 28px;
    }
    
    .time {
      font-size: 16px;
    }
  }
  
  .project-boxes {
    overflow-y: visible;
  }
}

// 超小屏幕设备 (375px及以下)
@media screen and (max-width: 375px) {
  .app-header-left {
    flex-wrap: wrap;
  }
  
  .search-wrapper {
    width: 100%;
    max-width: 100%;
    margin-top: 8px;
  }
  
  .projects-section {
    padding: 12px 8px;
    border-radius: 16px;
  }
  
  .projects-section-header p {
    font-size: 18px;
  }
}

// 保留原有的极窄屏幕处理
@media screen and (max-width: 200px) {
  .messages-section {
    transform: translateX(100%);
    position: absolute;
    opacity: 0;
    top: 0;
    z-index: 2;
    height: 100%;
    width: 100%;

    .messages-close {
      display: block;
    }
  }
}
</style>

<!-- Liquid Glass 样式 - 独立的 CSS 块 -->
<style>
:root {
  /* Global Glass Opacity Control */
  --glass-opacity: 0.25; 
}

/* Liquid Glass Back 按钮 */
.liquid-back {
  position: relative;
  width: 100%;
  height: 50vh;
  min-height: 40px;
  cursor: pointer;
  border-radius: 32px;
  cursor: pointer;
  border-radius: 32px;
  /* overflow: hidden; Re-enabled for border-radius */
  overflow: hidden;
  /* opacity: 0.7; Removed to avoid stacking context issues */
  /* transition: all 0.3s ease-in-out; Removed to avoid stacking context issues */
  /* Ensure z-index is handled carefully, local stacking context here is fine as long as parents are clean */
  isolation: isolate; /* Create local stacking context to contain children */
}

.liquid-back:hover {
  /* transform: scale(1.02); Handled by LiquidCard prop */
}

.liquid-back-effect {
  position: absolute;
  z-index: 0;
  inset: 0;
  backdrop-filter: url(#glass-distortion);
  -webkit-backdrop-filter: url(#glass-distortion);
  backdrop-filter: url(#glass-distortion);
  -webkit-backdrop-filter: url(#glass-distortion);
  border-radius: inherit; /* inherit from parent */
}

.liquid-back-tint {
  z-index: 1;
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.25);
}

.liquid-back-shine {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  border-radius: inherit;
  box-shadow: 
    inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5),
    inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5);
}

.liquid-back-content {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 50px;
  font-size: 50px;
  color: rgba(0, 0, 0, 0.6);
}
</style>

