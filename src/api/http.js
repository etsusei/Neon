import axios from "axios"

const normalizeBaseUrl = (url) => url.endsWith('/') ? url : `${url}/`

export const baseUrl = normalizeBaseUrl(process.env.VUE_APP_API_BASE_URL || 'https://neon.zeabur.app/')

export const apiClient = axios.create({
  baseURL: baseUrl,
  timeout: 15000
})

export const externalClient = axios.create({
  timeout: 15000
})

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
