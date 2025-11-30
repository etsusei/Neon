import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'
import 'font-awesome/css/font-awesome.css'
import store from './store'

createApp(App).use(router).use(ElementPlus).use(store).mount('#app')

