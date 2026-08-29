import axios from "axios"
import {
  getLocalTokenState,
  isLocalAuthCode,
  updateLocalToken
} from '../utils/localAuth'

const normalizeBaseUrl = (url) => url.endsWith('/') ? url : `${url}/`

export const baseUrl = normalizeBaseUrl(process.env.VUE_APP_API_BASE_URL || 'https://neon.zeabur.app/')

export const apiClient = axios.create({
  baseURL: baseUrl,
  timeout: 15000
})

export const externalClient = axios.create({
  timeout: 15000
})

const REFRESH_THROTTLE_MS = 30 * 60 * 1000
let refreshPromise = null
let lastRefreshAttemptAt = 0
let localAuthFailureHandler = null

export const setLocalAuthFailureHandler = handler => {
  localAuthFailureHandler = handler
}

const notifyLocalAuthFailure = authCode => {
  if (localAuthFailureHandler) localAuthFailureHandler(authCode)
}

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // 网易云登录态：整串 cookie 编码后放自定义头，后端解析后以用户账号调网易接口(严格模式，不再用服务器 VIP Cookie)
  const neteaseCookie = localStorage.getItem('netease_cookie')
  if (neteaseCookie && !config.headers['X-Netease-Cookie']) {
    config.headers['X-Netease-Cookie'] = encodeURIComponent(neteaseCookie)
  }
  return config
})

apiClient.interceptors.response.use(
  response => response,
  error => {
    const authCode = error.response?.data?.auth_code
    if (
      isLocalAuthCode(authCode) &&
      !error.config?.skipLocalAuthFailureHandling
    ) {
      notifyLocalAuthFailure(authCode)
    }
    return Promise.reject(error)
  }
)

// 应用启动/回到前台时静默续期。同一时刻只会发出一个续期请求，
// 且在一次活跃时段内限流，避免每次路由切换都续签。
export const refreshLocalSession = ({
  force = false,
  skipLocalAuthFailureHandling = false
} = {}) => {
  const state = getLocalTokenState()
  if (state.status !== 'valid') {
    if (
      !skipLocalAuthFailureHandling &&
      (state.status === 'expired' || state.status === 'invalid')
    ) {
      notifyLocalAuthFailure(
        state.status === 'expired' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
      )
    }
    return Promise.resolve(state)
  }

  // 管理员保持登录时签发的固定 7 天有效期。
  if (state.payload.is_admin) {
    return Promise.resolve({ ...state, status: 'admin' })
  }

  const now = Date.now()
  if (!force && now - lastRefreshAttemptAt < REFRESH_THROTTLE_MS) {
    return Promise.resolve({ ...state, status: 'throttled' })
  }
  if (refreshPromise) return refreshPromise

  lastRefreshAttemptAt = now
  refreshPromise = apiClient.post('api/auth/refresh', null, {
    skipLocalAuthFailureHandling
  }).then(response => {
    const token = response.data?.data?.token
    if (!token) throw new Error('Refresh response did not include a token')
    updateLocalToken(token)
    return { status: 'refreshed', token }
  }).finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

export const getWithRetry = async (url, { retries = 2, retryDelay = 800 } = {}) => {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await apiClient.get(url)
    } catch (e) {
      lastErr = e
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }
  throw lastErr
}
