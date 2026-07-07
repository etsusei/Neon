// 网易云登录态管理：cookie(MUSIC_U 等)与用户资料存 localStorage，
// http.js 拦截器读取后通过 X-Netease-Cookie 头带给后端（跨域下浏览器不会自动带 Cookie）

const COOKIE_KEY = 'netease_cookie'
const PROFILE_KEY = 'netease_profile'

export const getNeteaseCookie = () => localStorage.getItem(COOKIE_KEY) || ''

export const isNeteaseLoggedIn = () => getNeteaseCookie().includes('MUSIC_U')

export const getNeteaseProfile = () => {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null')
  } catch (e) {
    return null
  }
}

export const setNeteaseLogin = (cookie, profile) => {
  localStorage.setItem(COOKIE_KEY, cookie || '')
  if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export const clearNeteaseLogin = () => {
  localStorage.removeItem(COOKIE_KEY)
  localStorage.removeItem(PROFILE_KEY)
}
