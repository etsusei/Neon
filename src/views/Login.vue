<template>
  <div class="login-container">
    <div class="login-box">
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
    </div>
  </div>
</template>

<script>
import { login } from '../api/userApi'

export default {
  name: 'Login',
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      error: ''
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 360px;
}

.login-title {
  text-align: center;
  font-size: 36px;
  margin: 0 0 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.login-subtitle {
  text-align: center;
  color: #666;
  margin: 0 0 30px;
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
    color: #999;
  }
  
  input {
    width: 100%;
    padding: 14px 14px 14px 44px;
    border: 1px solid #ddd;
    border-radius: 10px;
    font-size: 15px;
    transition: all 0.2s;
    box-sizing: border-box;
    
    &:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
  }
}

.error-msg {
  color: #f5222d;
  font-size: 14px;
  margin: 0;
  text-align: center;
}

.login-btn {
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 10px;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}
</style>
