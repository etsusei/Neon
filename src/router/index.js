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
  },
  {
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      {
        path: '',
        redirect: { name: 'AdminDashboard' }
      },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('../views/admin/AdminDashboard.vue')
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/AdminUsers.vue')
      },
      {
        path: 'playlists',
        name: 'AdminPlaylists',
        component: () => import('../views/admin/AdminPlaylists.vue')
      }
    ]
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

  // 管理后台需要管理员权限
  if (to.matched.some(record => record.meta.requiresAdmin)) {
    let isAdmin = false
    try {
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
      isAdmin = !!userInfo.is_admin
    } catch (e) {
      isAdmin = false
    }
    if (!isAdmin) {
      next({ name: 'Home' })
      return
    }
  }

  next()
})

export default router
