const TOKEN_KEY = 'auth_token'
const USER_KEY = 'user_info'

export const LOCAL_AUTH_CODES = Object.freeze({
  REQUIRED: 'AUTH_REQUIRED',
  EXPIRED: 'TOKEN_EXPIRED',
  INVALID: 'TOKEN_INVALID'
})

const decodeBase64Url = value => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = window.atob(padded)
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export const getLocalToken = () => localStorage.getItem(TOKEN_KEY) || ''

export const setLocalSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token)
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const updateLocalToken = token => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearLocalSession = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const decodeLocalToken = token => {
  try {
    const parts = String(token || '').split('.')
    if (parts.length !== 3) return null
    return JSON.parse(decodeBase64Url(parts[1]))
  } catch (e) {
    return null
  }
}

export const getLocalTokenState = () => {
  const token = getLocalToken()
  if (!token) return { status: 'absent', token: '', payload: null }

  const payload = decodeLocalToken(token)
  if (!payload || !Number.isFinite(payload.exp)) {
    return { status: 'invalid', token, payload: null }
  }

  if (payload.exp * 1000 <= Date.now()) {
    return { status: 'expired', token, payload }
  }

  return { status: 'valid', token, payload }
}

export const isLocalAuthCode = authCode => Object.values(LOCAL_AUTH_CODES).includes(authCode)
