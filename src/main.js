import { createApp } from 'vue'
import App from './App.vue'
// Element Plus 按需引入：全量引入会把 ~600KB JS + ~300KB CSS 打进首屏包。
// 项目只用到 menu/tabs/icon 组件 + ElMessage/ElMessageBox（各组件内深路径引入），
// 这里只注册组件和引入对应样式。新增用到别的 el-* 组件时，记得在这里补注册 + 补 CSS。
import { ElMenu, ElMenuItem, ElSubMenu } from 'element-plus/es/components/menu'
import { ElTabs, ElTabPane } from 'element-plus/es/components/tabs'
import { ElIcon } from 'element-plus/es/components/icon'
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/el-menu.css'
import 'element-plus/theme-chalk/el-menu-item.css'
import 'element-plus/theme-chalk/el-sub-menu.css'
import 'element-plus/theme-chalk/el-icon.css'
import 'element-plus/theme-chalk/el-tabs.css'
import 'element-plus/theme-chalk/el-tab-pane.css'
// ElMessage / ElMessageBox 弹层相关样式（含其内部用到的 button/input/overlay/popper）
import 'element-plus/theme-chalk/el-message.css'
import 'element-plus/theme-chalk/el-message-box.css'
import 'element-plus/theme-chalk/el-button.css'
import 'element-plus/theme-chalk/el-input.css'
import 'element-plus/theme-chalk/el-overlay.css'
import 'element-plus/theme-chalk/el-popper.css'
import 'element-plus/theme-chalk/el-tooltip.css'
import 'element-plus/theme-chalk/el-scrollbar.css'
import router from './router'
import 'font-awesome/css/font-awesome.css'
import './css/mobile-player.css'
import store from './store'
// PrimeVue：管理后台 UI 框架（组件在各 admin 页面内按需引入）
// @primeuix 子路径由 vue.config.js 里的 alias 映射到 dist（webpack 4 不支持 exports）
import { liquidGlassDirective } from './utils/liquidGlass'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Aura from '@primeuix/themes/aura'
import 'primeicons/primeicons.css'

createApp(App)
  .use(router)
  .use(store)
  .use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        // 深色模式由 html 元素上的 .admin-dark class 控制（见 AdminLayout）
        darkModeSelector: '.admin-dark'
      }
    }
  })
  .use(ToastService)
  .use(ConfirmationService)
  .use(ElMenu)
  .use(ElMenuItem)
  .use(ElSubMenu)
  .use(ElTabs)
  .use(ElTabPane)
  .use(ElIcon)
  .directive('liquid-glass', liquidGlassDirective)
  .mount('#app')

// 让 Chromium/Android 把 Neon 识别为可安装 PWA，而不是普通桌面快捷方式。
// Service Worker 使用 network-only 策略，不缓存 API 或旧版前端资源。
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${process.env.BASE_URL}service-worker.js`)
      .catch(error => console.warn('Service worker registration failed:', error))
  })
}
