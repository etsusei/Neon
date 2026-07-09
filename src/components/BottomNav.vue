<template>
  <div class="bottom-nav">
    <div class="nav-content">
      <!-- Back Button -->
      <a class="nav-item" @click="goBack">
        <div class="icon-container">
          <i class="fa fa-angle-left"></i>
        </div>
        <span class="nav-label">Back</span>
      </a>

      <!-- Home -->
      <router-link :to="{ name: 'Home' }" class="nav-item" active-class="active">
        <div class="icon-container">
          <i class="fa fa-home"></i>
        </div>
        <span class="nav-label">Home</span>
      </router-link>

      <!-- Library (Heart) -->
      <router-link :to="{ name: 'MyPlaylists' }" class="nav-item" active-class="active">
        <div class="icon-container">
          <i class="fa fa-heart"></i>
        </div>
        <span class="nav-label">Library</span>
      </router-link>

      <!-- Search -->
      <router-link :to="{ name: 'Search', params: { keyword: ' ' } }" class="nav-item" active-class="active">
        <div class="icon-container">
          <i class="fa fa-search"></i>
        </div>
        <span class="nav-label">Search</span>
      </router-link>

      <!-- Settings -->
      <router-link :to="{ name: 'Settings' }" class="nav-item" active-class="active">
        <div class="icon-container">
          <i class="fa fa-cog"></i>
        </div>
        <span class="nav-label">Settings</span>
      </router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BottomNav',
  methods: {
    goBack() {
      // 展开态播放器盖住导航栏，这里只处理普通返回
      if (window.history.length > 1) {
        this.$router.back();
      } else {
        this.$router.push({ name: 'Home' });
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 900;
  width: 100%;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(50px) saturate(180%);
  -webkit-backdrop-filter: blur(50px) saturate(180%);
  border-top: 0.5px solid rgba(255, 255, 255, 0.3);
  /* Safe area padding - cascade fallbacks */
  padding-bottom: 20px;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  /* Force hardware layer */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}

.nav-content {
  display: flex;
  justify-content: space-around;
  align-items: center;
  /* 父级 .mobile-bottom-nav 是 flex 容器，不写宽度会被收缩成内容宽度 */
  width: 100%;
  height: 49px; /* Standard iOS Tab Bar height */
  padding: 0;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  text-decoration: none;
  font-size: 10px;
  transition: color 0.2s ease;
  cursor: pointer;
  flex: 1;
  height: 100%;
  padding-top: 5px;

  .nav-label {
    font-size: 10px;
    font-weight: 500;
    margin-top: 3px;
  }

  &.active {
    color: #fa233b;

    .nav-label {
      font-weight: 500;
      color: #fa233b;
    }
  }
}

.icon-container {
  font-size: 22px;
  margin-bottom: 0;
}
</style>

<!-- 暗色模式覆盖（依赖 body 类，须为全局样式） -->
<style lang="scss">
body.dark-mode-active .bottom-nav {
  background: rgba(23, 23, 23, 0.85);
  border-top-color: rgba(255, 255, 255, 0.1);

  .nav-item {
    color: #777;

    &.active,
    &.active .nav-label {
      color: #fa233b;
    }
  }
}
</style>
