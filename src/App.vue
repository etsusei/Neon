<template>
  <div>
    <!-- 静态背景 - 始终渲染，通过opacity控制显示 -->
    <background-animation :style="{ 
      opacity: isPlaying ? 0 : 1,
      transition: 'opacity 0.8s ease-in-out'
    }" />
    <!-- 动态背景 - 始终渲染，通过opacity控制显示 -->
    <dynamic-background 
      :visible="isPlaying" 
      :coverImage="currentCover"
      :style="{ 
        opacity: isPlaying ? 1 : 0,
        transition: 'opacity 0.8s ease-in-out'
      }"
    />
    <div class="app-container">
      <div class="app-header">
        <div class="app-header-left">
          <i class="fa fa-music" style="font-size: 24px"></i>
          <p class="app-name">Neon</p>
          <div class="search-wrapper">
            <input
              class="search-input"
              v-model="search"
              type="text"
              placeholder="Search"
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
        </div>
        <div class="app-header-right">
          <button class="profile-btn">
            <img
              src="https://img0.baidu.com/it/u=3522288622,363838562&fm=253&fmt=auto&app=138&f=JPEG?w=537&h=269"
            />
            <!-- http://p2.music.126.net/Dp_Zf9m4t7s3_IOxKb5GpQ==/109951163806722668.jpg -->
            <span>RYOZO</span>
          </button>
        </div>
      </div>
      <div class="app-content">
        <div class="app-sidebar">
          <router-link :to="{ name: 'Home' }">
            <p class="app-sidebar-link">
              <i class="fa fa-home" style="font-size: 24px"></i>
            </p>
          </router-link>
          <a href="" class="app-sidebar-link">
            <i class="fa fa-heart" style="font-size: 24px"></i>
          </a>
          <div class="back-warpper">
            <div class="back" @click="$router.back(-1)">
              <i class="fa fa-angle-left"></i>
            </div>
          </div>
        </div>
        <div class="projects-section">
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
        <div class="messages-section">
          <div class="projects-section-header">
            <p>Playlist</p>
          </div>
          <div class="messages">
            <playlist />
          </div>
        </div>
      </div>
      <music-player />
    </div>
  </div>
</template>

<script>
import dayjs from "dayjs";
import playlist from "../src/components/playlist.vue";
import MusicPlayer from "../src/components/MusicPlayer.vue";
import BackgroundAnimation from "../src/components/BackgroundAnimation.vue";
import DynamicBackground from "../src/components/DynamicBackground.vue";
import { mapGetters, mapState } from 'vuex';

export default {
  components: {
    playlist,
    MusicPlayer,
    BackgroundAnimation,
    DynamicBackground
  },
  data() {
    return {
      search: "",
      day: "",
      dayjs: null,
      dateToday: new Date(),
      currentCover: ''
    };
  },
  computed: {
    ...mapState(["tracks", "index", "nowPlay", "isPlaying", "currentTrackCover"]),
    ...mapGetters([]),
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
    }
  },
  methods: {
    searchClick() {
      this.$router.push({ name: "Search", params: { keyword: this.search } });
    },
  },
  created() {},
  mounted() {
    this.dayjs = require("dayjs");
    this.dateToday = dayjs().format("YYYY,MMM,DD");
    
    console.log('[App.vue] mounted - using Vuex isPlaying state');
  },
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
  --app-container: #fcfcfc00;
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
}

.app {
  &-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--app-container);
    transition: 0.2s;
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
    overflow: hidden;
    padding: 16px 24px 24px 0;
  }

  &-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 16px 24px;
    position: relative;

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
  background-color: rgba(255, 255, 255, 0.6);
  padding-right: 12px;
  height: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 480px;
  color: var(--light-font);
  box-shadow: 0 2px 6px 0 rgba(136, 148, 171, 0.2),
    0 24px 20px -24px rgba(71, 82, 107, 0.1);
  overflow: hidden;

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

.app-sidebar {
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
.back {
  width: 100%;
  height: 50vh;
  min-height: 40px;
  cursor: pointer;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  opacity: 0.3;
  transition: all 0.3s ease-in-out;
}
.back:hover {
  opacity: 1;
}
.projects-section {
  flex: 2;
  //background-color: var(--projects-section);
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 32px;
  padding: 32px 32px 0 32px;
  overflow: hidden;
  height: 80vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: auto;
  transition: all 300ms cubic-bezier(0.19, 1, 0.56, 1);
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
.projects-section::-webkit-scrollbar {
  width: 8px;
  border-radius: 10px;
  //background:rgba(190, 190, 190, 0.6)
}
.projects-section::-webkit-scrollbar-thumb {
  border-radius: 10px;
  //-webkit-box-shadow:inset 0 0 5px rgba(0,0,0,0.2);
  background: rgba(121, 121, 121, 0.3);
  cursor: pointer;
}
.projects-section::-webkit-scrollbar-track {
  border-radius: 10px;
  cursor: pointer;
  //background: rgba(190, 190, 190, 0.6);
}

.messages-section {
  flex-shrink: 0;
  padding-bottom: 32px;
  //background-color: var(--projects-section);
  background-color: rgba(255, 255, 255, 0.7);
  margin-left: 24px;
  max-width: 200px;
  //flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;
  height: 80vh;
  //height:400px;
  border-radius: 30px;
  position: relative;
  overflow: auto;
  transition: all 300ms cubic-bezier(0.19, 1, 0.56, 1);

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
.messages::-webkit-scrollbar {
  width: 8px;
  border-radius: 10px;
  //background:rgba(190, 190, 190, 0.6)
}
.messages::-webkit-scrollbar-thumb {
  border-radius: 10px;
  //-webkit-box-shadow:inset 0 0 5px rgba(0,0,0,0.2);
  background: rgba(121, 121, 121, 0.3);
}
.messages::-webkit-scrollbar-track {
  border-radius: 10px;
  //background: rgba(190, 190, 190, 0.6);
}

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

@media screen and (max-width: 720px) {
  .app-name,
  .profile-btn span {
    display: none;
  }
  .app-header-right button {
    margin-left: 4px;
  }
}
@media screen and (max-width: 520px) {
  .projects-section {
    overflow: auto;
  }
  .project-boxes {
    overflow-y: visible;
  }
}
</style>
