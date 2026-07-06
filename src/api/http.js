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
