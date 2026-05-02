import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/main.vue'),
  },
  {
    path: '/my-playlists',
    name: 'MyPlaylists',
    component: () => import('../views/MyPlaylists.vue'),
  },
  {
    path: '/my-playlists/:id',
    name: 'MyPlaylistDetail',
    component: () => import('../views/MyPlaylistDetail.vue'),
    props: true,
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
  },
  {
    path: '/listpage/:listId',
    name: 'List',
    component: () => import('../views/list.vue'),
    props: true,
  },
  {
    path: '/artistpage/:artistId',
    name: 'Artist',
    component: () => import('../views/artist.vue'),
    props: true,
  },
  {
    path: '/albumpage/:albumId',
    name: 'Album',
    component: () => import('../views/album.vue'),
    props: true,
  },
  {
    path: '/searchpage/:keyword',
    name: 'Search',
    component: () => import('../views/search.vue'),
    props: true,
  }
]

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token')

  // 登录页不需要认证
  if (to.name === 'Login') {
    next()
    return
  }

  // 其他页面需要认证
  if (!token) {
    next({ name: 'Login' })
    return
  }

  next()
})

export default router
