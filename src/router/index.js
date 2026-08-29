import { createRouter, createWebHashHistory } from 'vue-router'
import { ElMessage } from 'element-plus/es/components/message'
import {
  refreshLocalSession,
  setLocalAuthFailureHandler
} from '../api/http'
import {
  clearLocalSession,
  getLocalToken,
  getLocalTokenState
} from '../utils/localAuth'

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

let lastExpiryNoticeAt = 0

const loginLocation = redirect => ({
  name: 'Login',
  query: {
    reason: 'expired',
    mode: 'account',
    redirect
  }
})

const beginLocalRelogin = ({ redirect, navigate = true } = {}) => {
  const currentRoute = router.currentRoute.value
  const returnPath = redirect || (
    currentRoute.name === 'Login' ? '/' : currentRoute.fullPath
  )

  clearLocalSession()

  const now = Date.now()
  if (now - lastExpiryNoticeAt > 3000) {
    lastExpiryNoticeAt = now
    ElMessage.warning('登录已过期，请重新登录')
  }

  const target = loginLocation(returnPath)
  if (navigate && currentRoute.name !== 'Login') {
    router.replace(target)
  }
  return target
}

setLocalAuthFailureHandler(() => beginLocalRelogin())

// 路由守卫
router.beforeEach(async (to, from, next) => {
  // 登录页不需要认证
  if (to.name === 'Login') {
    next()
    return
  }

  const tokenState = getLocalTokenState()
  if (tokenState.status === 'expired' || tokenState.status === 'invalid') {
    next(beginLocalRelogin({ redirect: to.fullPath, navigate: false }))
    return
  }

  // 冷启动的第一次导航先让服务端校验并续签。断网/5xx 不会退出，
  // 只有服务端明确返回认证 auth_code 才转去登录页。
  if (tokenState.status === 'valid' && !tokenState.payload.is_admin) {
    try {
      await refreshLocalSession({ skipLocalAuthFailureHandling: true })
    } catch (err) {
      const authCode = err.response?.data?.auth_code
      if (['AUTH_REQUIRED', 'TOKEN_EXPIRED', 'TOKEN_INVALID'].includes(authCode)) {
        next(beginLocalRelogin({ redirect: to.fullPath, navigate: false }))
        return
      }
      // 网络错误或 5xx 时保留当前凭证，让页面按原有逻辑继续。
    }
  }

  // 自建账号 token 或网易云登录态，二者任一即视为已登录
  const token = getLocalToken() || localStorage.getItem('netease_cookie')

  // 其他页面需要认证
  if (!token) {
    next({ name: 'Login' })
    return
  }

  // 管理后台需要管理员权限
  if (to.matched.some(record => record.meta.requiresAdmin)) {
    // 界面守卫以 token 内的签名权限声明为准，不信任可手动修改的 user_info。
    const isAdmin = tokenState.status === 'valid' && !!tokenState.payload.is_admin
    if (!isAdmin) {
      next({ name: 'Home' })
      return
    }
  }

  next()
})

export default router
