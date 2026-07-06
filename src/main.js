import { createApp } from 'vue'
import App from './App.vue'
// Element Plus 按需引入：全量引入会把 ~600KB JS + ~300KB CSS 打进首屏包。
// 项目只用到 menu/tabs/icon 组件 + ElMessage/ElMessageBox（各组件内深路径引入），
// 这里只注册组件和引入对应样式。新增用到别的 el-* 组件时，记得在这里补注册 + 补 CSS。
import { ElMenu } from 'element-plus/es/components/menu'
import { ElTabs } from 'element-plus/es/components/tabs'
import { ElIcon } from 'element-plus/es/components/icon'
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/el-menu.css'
import 'element-plus/theme-chalk/el-menu-item.css'
import 'element-plus/theme-chalk/el-submenu.css'
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

// ElMenu/ElTabs 的 install 会连带注册 MenuItem/SubMenu、TabPane
createApp(App).use(router).use(store).use(ElMenu).use(ElTabs).use(ElIcon).mount('#app')
