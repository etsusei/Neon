<template>
  <div class="admin-layout">
    <Toast position="top-right" />
    <ConfirmDialog :draggable="false" />

    <!-- 侧边栏 -->
    <aside class="admin-sidebar">
      <div class="sidebar-brand">
        <i class="pi pi-bolt brand-icon"></i>
        <span class="brand-name">Neon Admin</span>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.route"
          :to="{ name: item.route }"
          class="nav-item"
          active-class="nav-item-active"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="footer-user">
          <Avatar :label="usernameInitial" shape="circle" />
          <span class="footer-username">{{ username }}</span>
        </div>
        <div class="footer-actions">
          <Button
            :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
            severity="secondary"
            text
            rounded
            :aria-label="isDark ? '切换为浅色模式' : '切换为深色模式'"
            v-tooltip.top="isDark ? '浅色模式' : '深色模式'"
            @click="toggleDark"
          />
          <Button
            icon="pi pi-home"
            severity="secondary"
            text
            rounded
            aria-label="返回前台"
            v-tooltip.top="'返回前台'"
            @click="$router.push('/')"
          />
          <Button
            icon="pi pi-sign-out"
            severity="danger"
            text
            rounded
            aria-label="退出登录"
            v-tooltip.top="'退出登录'"
            @click="logout"
          />
        </div>
      </div>
    </aside>

    <!-- 内容区 -->
    <main class="admin-content">
      <router-view />
    </main>
  </div>
</template>

<script>
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Tooltip from 'primevue/tooltip'

const DARK_KEY = 'admin_dark_mode'

export default {
  name: 'AdminLayout',
  components: {
    Button,
    Avatar,
    Toast,
    ConfirmDialog
  },
  directives: {
    tooltip: Tooltip
  },
  data() {
    return {
      isDark: false,
      navItems: [
        { route: 'AdminDashboard', label: '仪表盘', icon: 'pi pi-chart-bar' },
        { route: 'AdminUsers', label: '用户管理', icon: 'pi pi-users' },
        { route: 'AdminPlaylists', label: '歌单管理', icon: 'pi pi-list' }
      ]
    }
  },
  computed: {
    username() {
      try {
        return JSON.parse(localStorage.getItem('user_info') || '{}').username || 'Admin'
      } catch (e) {
        return 'Admin'
      }
    },
    usernameInitial() {
      return this.username.charAt(0).toUpperCase()
    }
  },
  created() {
    // 恢复深色模式偏好
    this.isDark = localStorage.getItem(DARK_KEY) === '1'
    this.applyDark()
  },
  unmounted() {
    // 离开管理后台时移除深色 class，不影响前台页面
    document.documentElement.classList.remove('admin-dark')
  },
  methods: {
    toggleDark() {
      this.isDark = !this.isDark
      localStorage.setItem(DARK_KEY, this.isDark ? '1' : '0')
      this.applyDark()
    },
    applyDark() {
      document.documentElement.classList.toggle('admin-dark', this.isDark)
    },
    logout() {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      this.$router.push('/login')
    }
  }
}
</script>

<style lang="scss">
/* 深色模式的整体底色（非 scoped：需要匹配 html 上的 .admin-dark） */
.admin-layout {
  background: var(--p-surface-100);
}

.admin-dark .admin-layout {
  background: var(--p-surface-950);
}
</style>

<style lang="scss" scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  color: var(--p-text-color);
}

/* ---------- 侧边栏 ---------- */
/* content-* 语义 token 会随 .admin-dark 自动切换深浅色 */
.admin-sidebar {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--p-content-background);
  border-right: 1px solid var(--p-content-border-color);
  position: sticky;
  top: 0;
  height: 100vh;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 20px 16px;

  .brand-icon {
    font-size: 22px;
    color: var(--p-primary-color);
  }

  .brand-name {
    font-size: 18px;
    font-weight: 700;
  }
}

.sidebar-nav {
  flex: 1;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 8px;
  color: var(--p-text-muted-color);
  text-decoration: none;
  font-size: 14.5px;
  transition: background 0.15s, color 0.15s;

  i {
    font-size: 16px;
  }

  &:hover {
    background: var(--p-content-hover-background);
    color: var(--p-text-color);
  }
}

.nav-item-active {
  background: var(--p-primary-color) !important;
  color: var(--p-primary-contrast-color) !important;
  font-weight: 600;
}

.sidebar-footer {
  padding: 14px 16px;
  border-top: 1px solid var(--p-content-border-color);
}

.footer-user {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;

  .footer-username {
    font-size: 14px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.footer-actions {
  display: flex;
  justify-content: space-between;
}

/* ---------- 内容区 ---------- */
.admin-content {
  flex: 1;
  min-width: 0;
  padding: 28px 32px;
}

@media (max-width: 768px) {
  .admin-sidebar {
    width: 68px;

    .brand-name,
    .footer-username,
    .nav-item span {
      display: none;
    }

    .sidebar-brand {
      justify-content: center;
      padding-left: 0;
      padding-right: 0;
    }

    .nav-item {
      justify-content: center;
    }

    .footer-user {
      justify-content: center;
    }

    .footer-actions {
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
  }

  .admin-content {
    padding: 20px 16px;
  }
}
</style>
