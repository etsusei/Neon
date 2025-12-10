<template>
  <div class="settings-page">
    <!-- 用户卡片 -->
    <div class="user-card">
      <div class="avatar-wrapper">
        <div class="avatar">
          <i class="fa fa-user"></i>
        </div>
        <div class="avatar-glow"></div>
      </div>
      <h2 class="user-name">{{ userInfo.username }}</h2>
      <p class="user-id">ID: {{ userInfo.id }}</p>
    </div>

    <!-- 设置卡片 -->
    <div class="settings-card">
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

    <!-- 退出登录 -->
    <button class="btn-logout" @click="handleLogout">
      <i class="fa fa-sign-out"></i> 退出登录
    </button>
  </div>
</template>

<script>
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
  max-width: 400px;
  margin: 0 auto;
  gap: 20px;
}

// 用户卡片
.user-card {
  width: 100%;
  text-align: center;
  padding: 30px 20px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 20px;
  position: relative;
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
  opacity: 0.4;
  z-index: 0;
}

.user-name {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.user-id {
  margin: 8px 0 0;
  font-size: 14px;
  color: #888;
}

// 设置卡片
.settings-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.form-row {
  margin-bottom: 18px;
  
  label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #555;
    
    .required {
      color: #f5222d;
      margin-left: 2px;
    }
  }
  
  input {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid #eee;
    border-radius: 12px;
    font-size: 15px;
    box-sizing: border-box;
    transition: all 0.2s;
    background: #fafafa;
    
    &:focus {
      outline: none;
      border-color: #667eea;
      background: white;
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    }
    
    &::placeholder {
      color: #ccc;
    }
  }
}

.msg {
  margin: 0 0 15px;
  padding: 12px 15px;
  border-radius: 10px;
  font-size: 14px;
  
  &.error {
    color: #f5222d;
    background: #fff2f0;
  }
  
  &.success {
    color: #52c41a;
    background: #f6ffed;
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
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

// 退出登录按钮
.btn-logout {
  width: 100%;
  padding: 14px;
  background: transparent;
  color: #999;
  border: 2px solid #eee;
  border-radius: 12px;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  
  &:hover {
    background: #ff4d4f;
    border-color: #ff4d4f;
    color: white;
  }
}
</style>
