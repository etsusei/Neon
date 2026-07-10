<template>
  <div class="login-container">
    <!-- 待机动态背景 (不模糊) -->
    <background-animation ref="bgAnimation" :no-blur="true" />
    
    <!-- SVG Filter for Liquid Glass -->
    <svg style="display: none;">
      <defs>
        <filter id="glass-distortion" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="1" seed="5" result="turbulence" />
          <feComponentTransfer in="turbulence" result="mapped">
            <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
            <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
            <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
          </feComponentTransfer>
          <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
          <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100"
            lighting-color="white" result="specLight">
            <fePointLight x="-200" y="-200" z="300" />
          </feSpecularLighting>
          <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
          <feDisplacementMap in="SourceGraphic" in2="softMap" scale="100" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
    
    <!-- 与登录后页面共用 LiquidCard + liquidGlass.js 的物理折射实现 -->
    <liquid-card
      custom-class="login-liquid-card"
      border-radius="32px"
      :tint-opacity="0.32"
    >
      <div class="liquid-glass-content">
        <h1 class="login-title">Neon</h1>
        <p class="login-subtitle">在线音乐播放器</p>

        <div class="login-mode-switch">
          <button
            type="button"
            :class="{ active: loginMode === 'account' }"
            @click="switchMode('account')"
          >账号登录</button>
          <button
            type="button"
            :class="{ active: loginMode === 'netease' }"
            @click="switchMode('netease')"
          >网易云登录</button>
        </div>

        <form v-if="loginMode === 'account'" @submit.prevent="handleLogin" class="login-form">
          <div class="input-group">
            <label for="login-username">用户名</label>
            <i class="fa fa-user"></i>
            <input 
              id="login-username"
              v-model="username" 
              type="text" 
              placeholder="用户名"
              autocomplete="username"
              required
            />
          </div>
          
          <div class="input-group">
            <label for="login-password">密码</label>
            <i class="fa fa-lock"></i>
            <input 
              id="login-password"
              v-model="password" 
              type="password" 
              placeholder="密码"
              autocomplete="current-password"
              required
            />
          </div>
          
          <p v-if="error" class="error-msg">{{ error }}</p>
          
          <button type="submit" class="login-btn" :disabled="loading">
            <span v-if="loading">登录中...</span>
            <span v-else>登录</span>
          </button>
        </form>

        <!-- 桌面端扫码，移动端手机号验证码登录 -->
        <div v-else class="netease-login">
          <template v-if="!showManualCookie">
            <form
              v-if="isMobileViewport"
              class="login-form netease-sms-form"
              @submit.prevent="handleNeteaseSmsLogin"
            >
              <p class="sms-intro">使用网易云绑定的中国大陆手机号登录</p>

              <div class="input-group">
                <label for="netease-phone">手机号</label>
                <i class="fa fa-mobile"></i>
                <input
                  id="netease-phone"
                  v-model.trim="neteasePhone"
                  type="tel"
                  inputmode="numeric"
                  autocomplete="tel"
                  maxlength="11"
                  placeholder="11 位手机号"
                  required
                />
              </div>

              <div class="input-group captcha-group">
                <label for="netease-captcha">短信验证码</label>
                <i class="fa fa-shield"></i>
                <input
                  id="netease-captcha"
                  v-model.trim="neteaseCaptcha"
                  type="text"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength="8"
                  placeholder="输入验证码"
                  required
                />
                <button
                  type="button"
                  class="captcha-send-btn"
                  :disabled="captchaSending || captchaCountdown > 0"
                  @click="handleSendCaptcha"
                >
                  {{ captchaSending ? '发送中' : captchaCountdown > 0 ? `${captchaCountdown}s` : '获取验证码' }}
                </button>
              </div>

              <p v-if="neteaseError" class="error-msg">{{ neteaseError }}</p>
              <button type="submit" class="login-btn" :disabled="neteaseLoading">
                {{ neteaseLoading ? '登录中...' : '登录网易云' }}
              </button>
              <a class="manual-toggle" @click="openManualCookie">验证码不可用？手动填入 Cookie</a>
            </form>

            <template v-else>
              <div class="qr-box">
                <img v-if="qrImg" :src="qrImg" alt="登录二维码" />
                <div v-else class="qr-loading"><i class="fa fa-spinner fa-spin"></i></div>
                <div v-if="qrStatus === 'expired'" class="qr-mask" @click="startNeteaseLogin">
                  <i class="fa fa-refresh"></i>
                  <span>二维码已过期<br/>点击刷新</span>
                </div>
                <div v-else-if="qrStatus === 'scanned'" class="qr-mask scanned">
                  <i class="fa fa-check-circle"></i>
                  <span>已扫码<br/>请在手机上确认</span>
                </div>
              </div>
              <p class="qr-hint">{{ qrHint }}</p>
              <p v-if="neteaseError" class="error-msg">{{ neteaseError }}</p>
              <a class="manual-toggle" @click="openManualCookie">扫码不可用？手动填入 Cookie</a>
            </template>
          </template>
          <template v-else>
            <textarea
              v-model="manualCookie"
              class="cookie-input"
              placeholder="粘贴网易云 Cookie（需包含 MUSIC_U=...）"
              rows="4"
            ></textarea>
            <p v-if="neteaseError" class="error-msg">{{ neteaseError }}</p>
            <button type="button" class="login-btn" :disabled="neteaseLoading" @click="handleManualCookieLogin">
              {{ neteaseLoading ? '验证中...' : '用 Cookie 登录' }}
            </button>
            <a class="manual-toggle" @click="backToNeteaseLogin">
              {{ isMobileViewport ? '返回验证码登录' : '返回扫码登录' }}
            </a>
          </template>
        </div>

        <div class="admin-entry">
          <a @click="showAdminDialog = true">
            <i class="fa fa-shield"></i> 管理员入口
          </a>
        </div>
      </div>
    </liquid-card>

    <!-- 管理员登录弹窗 -->
    <Dialog
      v-model:visible="showAdminDialog"
      modal
      header="管理员登录"
      :style="{ width: '360px' }"
      :draggable="false"
      @hide="resetAdminForm"
    >
      <form @submit.prevent="handleAdminLogin" class="admin-login-form">
        <div class="admin-field">
          <label for="admin-username">用户名</label>
          <InputText
            id="admin-username"
            v-model="adminUsername"
            autocomplete="username"
            fluid
          />
        </div>
        <div class="admin-field">
          <label for="admin-password">密码</label>
          <Password
            id="admin-password"
            v-model="adminPassword"
            :feedback="false"
            toggle-mask
            autocomplete="current-password"
            fluid
          />
        </div>

        <Message v-if="adminError" severity="error" :closable="false">{{ adminError }}</Message>

        <Button
          type="submit"
          label="进入管理系统"
          icon="pi pi-sign-in"
          :loading="adminLoading"
          fluid
        />
      </form>
    </Dialog>
  </div>
</template>

<script>
import { login } from '../api/userApi'
import {
  getQrKey,
  checkQrStatus,
  getNeteaseLoginStatus,
  sendNeteaseCaptcha,
  loginNeteaseWithCaptcha
} from '../api/neteaseUserApi'
import { setNeteaseLogin, isNeteaseLoggedIn } from '../utils/neteaseAuth'
import QRCode from 'qrcode'
import BackgroundAnimation from '../components/BackgroundAnimation.vue'
import LiquidCard from '../components/LiquidCard.vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'

export default {
  name: 'Login',
  components: {
    BackgroundAnimation,
    LiquidCard,
    Dialog,
    InputText,
    Password,
    Button,
    Message
  },
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      error: '',
      // 管理员登录弹窗
      showAdminDialog: false,
      adminUsername: '',
      adminPassword: '',
      adminLoading: false,
      adminError: '',
      // 网易云扫码登录
      loginMode: 'account',
      qrImg: '',
      qrStatus: 'loading', // loading | waiting | scanned | expired | success
      qrKey: '',
      pollTimer: null,
      pollInFlight: false,
      neteaseError: '',
      neteaseLoading: false,
      showManualCookie: false,
      manualCookie: '',
      // 移动端网易云验证码登录
      isMobileViewport: false,
      neteasePhone: '',
      neteaseCaptcha: '',
      captchaSending: false,
      captchaCountdown: 0,
      captchaTimer: null,
      mobileMediaQuery: null
    }
  },
  computed: {
    qrHint() {
      switch (this.qrStatus) {
        case 'loading': return '二维码加载中...'
        case 'scanned': return '已扫码，请在手机上确认登录'
        case 'expired': return '二维码已过期'
        case 'success': return '登录成功，正在跳转...'
        default: return '使用网易云音乐 App 扫码登录'
      }
    }
  },
  methods: {
    async handleLogin() {
      this.error = ''
      this.loading = true

      try {
        const res = await login(this.username, this.password)
        if (res.data.code === 200) {
          localStorage.setItem('auth_token', res.data.data.token)
          localStorage.setItem('user_info', JSON.stringify(res.data.data.user))
          this.$router.push('/')
        } else {
          this.error = res.data.msg || '登录失败'
        }
      } catch (err) {
        this.error = err.response?.data?.msg || '网络错误'
      } finally {
        this.loading = false
      }
    },
    async handleAdminLogin() {
      if (!this.adminUsername || !this.adminPassword) {
        this.adminError = '请输入用户名和密码'
        return
      }
      this.adminError = ''
      this.adminLoading = true

      try {
        const res = await login(this.adminUsername, this.adminPassword)
        if (res.data.code === 200) {
          if (!res.data.data.user.is_admin) {
            this.adminError = '该账号没有管理员权限'
            return
          }
          localStorage.setItem('auth_token', res.data.data.token)
          localStorage.setItem('user_info', JSON.stringify(res.data.data.user))
          this.$router.push('/admin')
        } else {
          this.adminError = res.data.msg || '登录失败'
        }
      } catch (err) {
        this.adminError = err.response?.data?.msg || '网络错误'
      } finally {
        this.adminLoading = false
      }
    },
    resetAdminForm() {
      this.adminUsername = ''
      this.adminPassword = ''
      this.adminError = ''
      this.adminLoading = false
    },
    // ========== 网易云扫码登录 ==========
    switchMode(mode) {
      if (this.loginMode === mode) return
      this.loginMode = mode
      this.neteaseError = ''
      if (mode === 'netease') {
        this.showManualCookie = false
        if (this.isMobileViewport) {
          this.stopPolling()
        } else {
          this.startNeteaseLogin()
        }
      } else {
        this.stopPolling()
      }
    },
    handleViewportChange(event) {
      const nextMobile = !!event.matches
      if (this.isMobileViewport === nextMobile) return
      this.isMobileViewport = nextMobile

      if (this.loginMode !== 'netease' || this.showManualCookie) return
      if (nextMobile) {
        this.stopPolling()
        this.qrImg = ''
      } else {
        this.startNeteaseLogin()
      }
    },
    isValidNeteasePhone() {
      return /^1\d{10}$/.test(this.neteasePhone)
    },
    startCaptchaCountdown() {
      if (this.captchaTimer) clearInterval(this.captchaTimer)
      this.captchaCountdown = 60
      this.captchaTimer = setInterval(() => {
        this.captchaCountdown -= 1
        if (this.captchaCountdown <= 0) {
          clearInterval(this.captchaTimer)
          this.captchaTimer = null
          this.captchaCountdown = 0
        }
      }, 1000)
    },
    async handleSendCaptcha() {
      if (!this.isValidNeteasePhone()) {
        this.neteaseError = '请输入正确的 11 位手机号'
        return
      }
      if (this.captchaSending || this.captchaCountdown > 0) return

      this.neteaseError = ''
      this.captchaSending = true
      try {
        const res = await sendNeteaseCaptcha(this.neteasePhone)
        if (res.data?.code !== 200) {
          this.neteaseError = res.data?.message || res.data?.msg || '验证码发送失败'
          return
        }
        this.startCaptchaCountdown()
      } catch (err) {
        this.neteaseError = err.response?.data?.message || err.response?.data?.msg || '验证码发送失败，请稍后重试'
      } finally {
        this.captchaSending = false
      }
    },
    async handleNeteaseSmsLogin() {
      if (!this.isValidNeteasePhone()) {
        this.neteaseError = '请输入正确的 11 位手机号'
        return
      }
      if (!/^\d{4,8}$/.test(this.neteaseCaptcha)) {
        this.neteaseError = '请输入正确的短信验证码'
        return
      }

      this.neteaseError = ''
      this.neteaseLoading = true
      try {
        const res = await loginNeteaseWithCaptcha(this.neteasePhone, this.neteaseCaptcha)
        if (res.data?.code !== 200) {
          this.neteaseError = res.data?.message || res.data?.msg || '验证码登录失败'
          return
        }
        await this.finishNeteaseLogin(res.data.cookie)
      } catch (err) {
        this.neteaseError = err.response?.data?.message || err.response?.data?.msg || '验证码登录失败，请稍后重试'
      } finally {
        this.neteaseLoading = false
      }
    },
    async startNeteaseLogin() {
      this.stopPolling()
      this.qrImg = ''
      this.qrStatus = 'loading'
      this.neteaseError = ''
      try {
        const res = await getQrKey()
        const unikey = res.data?.data?.unikey
        if (!unikey) throw new Error('no unikey')
        this.qrKey = unikey
        this.qrImg = await QRCode.toDataURL(`https://music.163.com/login?codekey=${unikey}`, {
          width: 200,
          margin: 1
        })
        this.qrStatus = 'waiting'
        this.pollTimer = setInterval(this.pollQrStatus, 2000)
      } catch (err) {
        console.error('QR key error:', err)
        this.qrStatus = 'expired'
        this.neteaseError = '获取二维码失败，请点击刷新重试'
      }
    },
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
      this.pollInFlight = false
    },
    async pollQrStatus() {
      if (this.pollInFlight || !this.qrKey) return
      this.pollInFlight = true
      try {
        const res = await checkQrStatus(this.qrKey)
        const code = res.data?.code
        if (code === 800) {
          this.qrStatus = 'expired'
          this.stopPolling()
        } else if (code === 802) {
          this.qrStatus = 'scanned'
        } else if (code === 803) {
          this.stopPolling()
          this.qrStatus = 'success'
          await this.finishNeteaseLogin(res.data.cookie)
        } else if (code !== undefined && code !== 801) {
          // 其他状态码（如 8821 风控）：终止轮询，展示网易返回的真实原因
          this.stopPolling()
          this.qrStatus = 'expired'
          this.neteaseError = `${res.data.message || '登录失败'} (${code})，可尝试手动 Cookie 登录`
        }
        // 801 等待扫码：保持现状继续轮询
      } catch (err) {
        // HTTP 错误时响应体里往往有真实状态码，能识别就按上面的逻辑处理
        const body = err.response?.data
        if (body && body.code !== undefined && ![800, 801, 802, 803].includes(body.code)) {
          this.stopPolling()
          this.qrStatus = 'expired'
          this.neteaseError = `${body.message || '登录失败'} (${body.code})，可尝试手动 Cookie 登录`
        } else {
          // 单次轮询失败不终止流程，下一轮继续
          console.error('QR poll error:', err)
        }
      } finally {
        this.pollInFlight = false
      }
    },
    // 从 Set-Cookie 拼出的串里剔除 Max-Age/Expires/Path 等属性，只留真正的键值对
    cleanCookieString(raw) {
      return String(raw || '')
        .split(';')
        .map(s => s.trim())
        .filter(p => p && p.includes('=') && !/^(Max-Age|Expires|Path|Domain|HTTPOnly|Secure|SameSite)=/i.test(p))
        .join('; ')
    },
    async finishNeteaseLogin(rawCookie) {
      const cookie = this.cleanCookieString(rawCookie)
      if (!cookie.includes('MUSIC_U')) {
        this.qrStatus = 'expired'
        this.neteaseError = '登录响应缺少凭证（可能被风控拦截），请重试或改用手动 Cookie'
        return
      }
      this.neteaseLoading = true
      try {
        const res = await getNeteaseLoginStatus(cookie)
        const profile = res.data?.data?.profile
        if (!profile) {
          this.qrStatus = 'expired'
          this.neteaseError = '登录态无效或已过期'
          return
        }
        setNeteaseLogin(cookie, {
          userId: profile.userId,
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl
        })
        this.$router.push('/')
      } catch (err) {
        console.error('NetEase login status error:', err)
        this.qrStatus = 'expired'
        this.neteaseError = '验证登录态失败，请重试'
      } finally {
        this.neteaseLoading = false
      }
    },
    openManualCookie() {
      this.stopPolling()
      this.showManualCookie = true
      this.neteaseError = ''
    },
    backToNeteaseLogin() {
      this.showManualCookie = false
      this.neteaseError = ''
      if (!this.isMobileViewport) this.startNeteaseLogin()
    },
    async handleManualCookieLogin() {
      const cookie = this.cleanCookieString(this.manualCookie)
      if (!cookie.includes('MUSIC_U')) {
        this.neteaseError = 'Cookie 中必须包含 MUSIC_U 字段'
        return
      }
      await this.finishNeteaseLogin(cookie)
    }
  },
  mounted() {
    // 如果已登录（自建账号或网易云任一），跳转首页
    if (localStorage.getItem('auth_token') || isNeteaseLoggedIn()) {
      this.$router.push('/')
      return
    }

    this.mobileMediaQuery = window.matchMedia('(max-width: 520px)')
    this.isMobileViewport = this.mobileMediaQuery.matches
    if (this.mobileMediaQuery.addEventListener) {
      this.mobileMediaQuery.addEventListener('change', this.handleViewportChange)
    } else {
      this.mobileMediaQuery.addListener(this.handleViewportChange)
    }
  },
  beforeUnmount() {
    this.stopPolling()
    if (this.captchaTimer) clearInterval(this.captchaTimer)
    if (this.mobileMediaQuery?.removeEventListener) {
      this.mobileMediaQuery.removeEventListener('change', this.handleViewportChange)
    } else {
      this.mobileMediaQuery?.removeListener(this.handleViewportChange)
    }
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  /* 固定定位铺满整屏（含 iOS 安全区），避免 PWA 下出现空隙 */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: transparent;
  z-index: 0;
}

/* 登录后页面同款 LiquidCard；折射与边缘高光由 liquidGlass.js 生成。 */
.login-liquid-card {
  position: relative;
  width: min(460px, calc(100vw - 32px));
  height: auto;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 2.2);
  z-index: 10;
  --login-ink: rgba(24, 31, 45, 0.92);
  --login-ink-soft: rgba(43, 53, 71, 0.72);
}

.liquid-glass-content {
  padding: 48px 40px;
  width: 100%;
}

/* 登录表单样式 */
.login-title {
  text-align: center;
  font-size: 42px;
  margin: 0 0 8px;
  color: var(--login-ink);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.78);
  font-weight: 700;
}

.login-subtitle {
  text-align: center;
  color: var(--login-ink-soft);
  margin: 0 0 32px;
  font-size: 16px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  position: relative;

  label {
    display: block;
    margin: 0 0 7px 2px;
    color: rgba(30, 38, 54, 0.82);
    font-size: 13px;
    font-weight: 650;
    letter-spacing: 0.02em;
  }
  
  i {
    position: absolute;
    left: 16px;
    top: 42px;
    transform: translateY(-50%);
    color: rgba(43, 55, 76, 0.62);
  }
  
  input {
    width: 100%;
    padding: 14px 14px 14px 44px;
    border: 1px solid rgba(255, 255, 255, 0.68);
    border-radius: 12px;
    font-size: 15px;
    transition: all 0.2s;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.48);
    color: var(--login-ink);
    font-weight: 500;
    backdrop-filter: blur(14px) saturate(115%);
    -webkit-backdrop-filter: blur(14px) saturate(115%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.46);
    
    &::placeholder {
      color: rgba(43, 55, 76, 0.48);
    }
    
    &:focus {
      outline: none;
      border-color: rgba(116, 153, 205, 0.62);
      background: rgba(255, 255, 255, 0.72);
      box-shadow: 0 0 0 3px rgba(145, 183, 232, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.76);
    }
  }
}

.error-msg {
  color: #8a3040;
  font-size: 14px;
  margin: 0;
  text-align: center;
  padding: 9px 12px;
  border: 1px solid rgba(177, 80, 98, 0.22);
  border-radius: 10px;
  background: rgba(255, 225, 231, 0.58);
}

/* 登录方式切换 */
.login-mode-switch {
  display: flex;
  background: rgba(255, 255, 255, 0.24);
  border: 1px solid rgba(255, 255, 255, 0.48);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;

  button {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: rgba(43, 53, 71, 0.62);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      background: rgba(255, 255, 255, 0.66);
      color: var(--login-ink);
      box-shadow: 0 3px 10px rgba(65, 79, 107, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.86);
    }
  }
}

/* 网易云扫码登录 */
.netease-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.netease-sms-form {
  width: 100%;
}

.sms-intro {
  margin: 0 0 2px;
  color: var(--login-ink-soft);
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

.captcha-group {
  input {
    padding-right: 124px;
  }
}

.captcha-send-btn {
  position: absolute;
  right: 6px;
  bottom: 6px;
  min-width: 108px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.66);
  color: rgba(35, 48, 69, 0.78);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }
}

.qr-box {
  position: relative;
  width: 200px;
  height: 200px;
  border-radius: 16px;
  overflow: hidden;
  background: white;
  border: 1px solid rgba(255, 255, 255, 0.76);
  box-shadow: 0 10px 28px rgba(53, 67, 95, 0.16);

  img {
    display: block;
    width: 100%;
    height: 100%;
  }

  .qr-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #999;
    font-size: 28px;
  }

  .qr-mask {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    text-align: center;
    font-size: 14px;
    cursor: pointer;

    i {
      font-size: 30px;
    }

    &.scanned {
      cursor: default;

      i {
        color: #52c41a;
      }
    }
  }
}

.qr-hint {
  margin: 0;
  color: var(--login-ink-soft);
  font-size: 14px;
  text-align: center;
}

.manual-toggle {
  color: rgba(38, 50, 70, 0.64);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: rgba(24, 31, 45, 0.92);
  }
}

.cookie-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 12px;
  font-size: 13px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.48);
  color: var(--login-ink);
  backdrop-filter: blur(14px) saturate(115%);
  -webkit-backdrop-filter: blur(14px) saturate(115%);
  resize: vertical;

  &::placeholder {
    color: rgba(43, 55, 76, 0.48);
  }

  &:focus {
    outline: none;
    border-color: rgba(116, 153, 205, 0.62);
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 0 0 3px rgba(145, 183, 232, 0.24);
  }
}

.admin-entry {
  margin-top: 20px;
  text-align: center;

  a {
    color: rgba(38, 50, 70, 0.64);
    font-size: 13px;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: rgba(24, 31, 45, 0.92);
    }
  }
}

.admin-login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 4px;

  .admin-field {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
      font-size: 13px;
      font-weight: 600;
    }
  }
}

.login-btn {
  padding: 14px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(218, 234, 255, 0.76));
  color: rgba(25, 37, 57, 0.90);
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 10px;
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  box-shadow: 0 10px 24px rgba(72, 91, 123, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.92);
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(228, 241, 255, 0.90));
    transform: translateY(-2px);
    box-shadow: 0 14px 30px rgba(72, 91, 123, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.98);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

@media (max-width: 520px) {
  .login-container {
    justify-content: center;
    padding:
      calc(16px + env(safe-area-inset-top))
      12px
      calc(16px + env(safe-area-inset-bottom));
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  /*
   * 移动端降级为登录后迷你播放器使用的雾面卡片：
   * 不运行位移折射层，只保留系统模糊、浅色底、细边框与高光。
   */
  .login-liquid-card {
    flex: 0 0 auto;
    width: 100%;
    max-width: 460px;
    background-color: rgba(255, 255, 255, 0.4) !important;
    backdrop-filter: blur(40px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
    border: 0.5px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
  }

  :deep(.login-liquid-card .liquid-card-effect) {
    display: none !important;
    background-image: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  :deep(.login-liquid-card .liquid-card-tint) {
    --glass-opacity: 0.25 !important;
  }

  .liquid-glass-content {
    padding: 36px 24px;
  }
}

/* 极矮屏幕允许卡片从安全区顶部开始滚动，避免表单被裁切。 */
@media (max-width: 520px) and (max-height: 700px) {
  .login-container {
    justify-content: flex-start;
  }
}

/* 老旧 WebView 不支持背景模糊时，使用更实的浅色雾面兜底。 */
@media (max-width: 520px) {
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .login-liquid-card {
      background-color: rgba(245, 249, 255, 0.82) !important;
    }
  }
}
</style>


