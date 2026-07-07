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
    
    <!-- Liquid Glass 登录框 -->
    <div class="liquid-glass-wrapper">
      <div class="liquid-glass-effect"></div>
      <div class="liquid-glass-tint"></div>
      <div class="liquid-glass-shine"></div>
      <div class="liquid-glass-content">
        <h1 class="login-title">Neon</h1>
        <p class="login-subtitle">在线音乐播放器</p>
        
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="input-group">
            <i class="fa fa-user"></i>
            <input 
              v-model="username" 
              type="text" 
              placeholder="用户名"
              autocomplete="username"
              required
            />
          </div>
          
          <div class="input-group">
            <i class="fa fa-lock"></i>
            <input 
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

        <div class="admin-entry">
          <a @click="showAdminDialog = true">
            <i class="fa fa-shield"></i> 管理员入口
          </a>
        </div>
      </div>
    </div>

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
import BackgroundAnimation from '../components/BackgroundAnimation.vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'

export default {
  name: 'Login',
  components: {
    BackgroundAnimation,
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
      adminError: ''
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
    }
  },
  mounted() {
    // 如果已登录，跳转首页
    if (localStorage.getItem('auth_token')) {
      this.$router.push('/')
    }
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: transparent;
  z-index: 0;
}

.liquid-glass-filter {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
}

/* Liquid Glass 样式 */
.liquid-glass-wrapper {
  position: relative;
  display: flex;
  overflow: hidden;
  border-radius: 32px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 2.2);
  z-index: 10;
  
  &:hover {
    transform: scale(1.02);
  }
}

.liquid-glass-effect {
  position: absolute;
  z-index: 0;
  inset: 0;
  backdrop-filter: url(#glass-distortion);
  overflow: hidden;
  isolation: isolate;
}

.liquid-glass-tint {
  z-index: 1;
  position: absolute;
  inset: 0;
  background: transparent;
}

.liquid-glass-shine {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  border-radius: inherit;
  box-shadow: 
    inset 1px 1px 1px 0 rgba(255, 255, 255, 0.3),
    inset -1px -1px 1px 0 rgba(255, 255, 255, 0.2);
}

.liquid-glass-content {
  z-index: 3;
  padding: 48px 40px;
  width: 380px;
}

/* 登录表单样式 */
.login-title {
  text-align: center;
  font-size: 42px;
  margin: 0 0 8px;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  font-weight: 700;
}

.login-subtitle {
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
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
  
  i {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.6);
  }
  
  input {
    width: 100%;
    padding: 14px 14px 14px 44px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    font-size: 15px;
    transition: all 0.2s;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    backdrop-filter: blur(10px);
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
    
    &:focus {
      outline: none;
      border-color: rgba(255, 255, 255, 0.6);
      background: rgba(255, 255, 255, 0.15);
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
    }
  }
}

.error-msg {
  color: #ff6b6b;
  font-size: 14px;
  margin: 0;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.admin-entry {
  margin-top: 20px;
  text-align: center;

  a {
    color: rgba(255, 255, 255, 0.55);
    font-size: 13px;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: rgba(255, 255, 255, 0.9);
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
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 10px;
  backdrop-filter: blur(10px);
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}
</style>

<!-- 非 scoped 样式，用于 SVG filter -->
<style lang="scss">
/* Liquid Glass 扭曲效果需要非 scoped 样式才能正确引用 SVG filter */
.liquid-glass-effect {
  filter: url(#glass-distortion) !important;
}
</style>


