<template>
  <div class="settings-page">
    <!-- 用户卡片 -->
    <div class="user-card-wrapper">
      <liquid-card custom-class="user-card-glass" :hover-effect="true">
        <div class="user-card-content">
          <div class="avatar-wrapper">
            <div class="avatar">
              <i class="fa fa-user"></i>
            </div>
            <div class="avatar-glow"></div>
          </div>
          <h2 class="user-name">{{ userInfo.username }}</h2>
          <p class="user-id">ID: {{ userInfo.id }}</p>
        </div>
      </liquid-card>
    </div>

    <!-- 设置卡片 -->
    <div class="settings-card-wrapper">
      <liquid-card custom-class="settings-card-glass">
        <div class="settings-form-content">
          <form @submit.prevent="handleUpdate">
            <div class="form-row">
              <label>新用户名</label>
              <input v-model="newUsername" type="text" placeholder="留空则保持不变" />
            </div>
            
            <div class="form-row">
              <label>当前密码 <span class="required">*</span></label>
              <input v-model="currentPassword" type="password" placeholder="验证身份" required />
            </div>
            
            <div class="form-row">
              <label>新密码</label>
              <input v-model="newPassword" type="password" placeholder="留空则保持不变" />
            </div>
            
            <p v-if="error" class="msg error">{{ error }}</p>
            <p v-if="success" class="msg success">{{ success }}</p>
            
            <button type="submit" class="btn-save" :disabled="loading">
              {{ loading ? '保存中...' : '保存修改' }}
            </button>
          </form>
        </div>
      </liquid-card>
    </div>

    <!-- 退出登录 -->
    <button class="btn-logout" @click="handleLogout">
      <i class="fa fa-sign-out"></i> 退出登录
    </button>
  </div>
</template>

<script>
import LiquidCard from '../components/LiquidCard.vue'
import { updateProfile } from '../api/userApi'
import { ElMessage } from 'element-plus'

export default {
  name: 'Settings',
  data() {
    return {
      userInfo: {},
      newUsername: '',
      currentPassword: '',
      newPassword: '',
      loading: false,
      error: '',
      success: ''
    }
  },
  components: {
    LiquidCard
  },
  methods: {
    async handleUpdate() {
      this.error = ''
      this.success = ''
      
      if (!this.currentPassword) {
        this.error = '请输入当前密码'
        return
      }
      
      this.loading = true
      
      try {
        const data = {
          password: this.currentPassword
        }
        
        if (this.newUsername.trim()) {
          data.username = this.newUsername.trim()
        }
        
        if (this.newPassword) {
          data.newPassword = this.newPassword
        }
        
        const res = await updateProfile(data)
        
        if (res.data.code === 200) {
          this.success = '更新成功'
          this.currentPassword = ''
          this.newPassword = ''
          
          if (data.username) {
            this.userInfo.username = data.username
            localStorage.setItem('user_info', JSON.stringify(this.userInfo))
            this.newUsername = ''
          }
        } else {
          this.error = res.data.msg || '更新失败'
        }
      } catch (err) {
        this.error = err.response?.data?.msg || '网络错误'
      } finally {
        this.loading = false
      }
    },
    handleLogout() {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      this.$router.push('/login')
      ElMessage.success('已退出登录')
    }
  },
  async mounted() {
    // 先从 localStorage 显示，然后从服务器获取最新信息
    const stored = localStorage.getItem('user_info')
    if (stored) {
      this.userInfo = JSON.parse(stored)
    }
    
    // 从服务器获取最新用户信息
    try {
      const { getCurrentUser } = await import('../api/userApi')
      const res = await getCurrentUser()
      if (res.data.code === 200) {
        this.userInfo = res.data.data
        localStorage.setItem('user_info', JSON.stringify(this.userInfo))
      }
    } catch (err) {
      console.error('获取用户信息失败:', err)
    }
  }
}
</script>

<style lang="scss" scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 20px;
  max-width: 500px; /* Slightly wider */
  margin: 0 auto;
  gap: 20px;
}

// Wrapper to hold LiquidCard
.user-card-wrapper, .settings-card-wrapper {
  width: 100%;
  position: relative;
  /* Make sure liquid card can determine its size */
}

.user-card-content {
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* background: rgba(255, 255, 255, 0.1); No opaque bg */
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 15px;
}

.avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  box-shadow: 0 0 15px rgba(118, 75, 162, 0.5); /* Neon glow */
  
  i {
    font-size: 40px;
    color: white;
  }
}

.avatar-glow {
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  filter: blur(15px);
  opacity: 0.6; /* Boosted */
  z-index: 0;
}

.user-name {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--main-color); /* Use app theme color */
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.user-id {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--light-font);
  opacity: 0.8;
}

// Settings Form
.settings-form-content {
  padding: 25px;
}

.form-row {
  margin-bottom: 20px;
  
  label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--main-color);
    
    .required {
      color: #ff4d4f;
      margin-left: 2px;
    }
  }
  
  input {
    width: 100%;
    padding: 14px 16px;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 12px;
    font-size: 15px;
    box-sizing: border-box;
    transition: all 0.3s;
    background: rgba(255, 255, 255, 0.1); /* Glassy input */
    color: var(--main-color);
    
    &:focus {
      outline: none;
      border-color: #764ba2;
      background: rgba(255, 255, 255, 0.2);
      box-shadow: 0 0 10px rgba(118, 75, 162, 0.3);
    }
    
    &::placeholder {
      color: rgba(0,0,0,0.4); /* Darker placeholder for glass */
      .dark & {
         color: rgba(255,255,255,0.4);
      }
    }
  }
}

.msg {
  margin: 0 0 15px;
  padding: 12px 15px;
  border-radius: 10px;
  font-size: 14px;
  
  &.error {
    color: #ff4d4f;
    background: rgba(255, 77, 79, 0.1);
    border: 1px solid rgba(255, 77, 79, 0.2);
  }
  
  &.success {
    color: #52c41a;
    background: rgba(82, 196, 26, 0.1);
    border: 1px solid rgba(82, 196, 26, 0.2);
  }
}

.btn-save {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(118, 75, 162, 0.3);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(118, 75, 162, 0.5);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

// Logout button
.btn-logout {
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--light-font);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s;
  backdrop-filter: blur(5px);
  
  &:hover {
    background: rgba(255, 77, 79, 0.8);
    border-color: #ff4d4f;
    color: white;
    box-shadow: 0 0 15px rgba(255, 77, 79, 0.4);
  }
}
</style>
