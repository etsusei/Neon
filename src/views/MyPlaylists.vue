<template>
  <div class="my-playlists-container">
    <div class="header">
      <h1>我的歌单</h1>
      <div class="header-actions">
        <template v-if="selectMode">
          <span class="select-hint">已选 {{ selectedIds.length }} 个</span>
          <button class="cancel-btn" @click="cancelSelect">取消</button>
          <button class="confirm-export-btn" @click="confirmExport" :disabled="selectedIds.length === 0">
            <i class="fa fa-download"></i> 导出选中
          </button>
        </template>
        <template v-else>
          <button class="export-btn" @click="enterSelectMode">
            <i class="fa fa-download"></i> 导出
          </button>
          <div class="import-dropdown" :class="{ open: showImportMenu }">
            <button class="import-btn" @click="showImportMenu = !showImportMenu">
              <i class="fa fa-upload"></i> 导入 <i class="fa fa-caret-down"></i>
            </button>
            <div class="dropdown-menu" v-if="showImportMenu" @click.stop>
              <div class="dropdown-item" @click="openNetEaseImport">
                <i class="fa fa-cloud-download"></i> 从网易云导入
              </div>
              <div class="dropdown-item" @click="triggerJsonImport">
                <i class="fa fa-file-code-o"></i> 上传 JSON 文件
              </div>
            </div>
          </div>
        </template>
        <input 
          ref="importInput" 
          type="file" 
          accept=".json" 
          style="display: none" 
          @change="handleImport"
        />
      </div>
    </div>
    
    <!-- 从网易云导入弹窗 -->
    <ImportFromNetEasePopup 
      :show="showNetEaseImport" 
      @close="showNetEaseImport = false"
      @imported="loadPlaylists"
    />

    <div class="create-playlist" v-if="!selectMode">
      <input 
        v-model="newPlaylistName" 
        placeholder="新建歌单..."
        @keyup.enter="createNewPlaylist"
      />
      <button @click="createNewPlaylist" :disabled="!newPlaylistName.trim()">
        <i class="fa fa-plus"></i>
      </button>
    </div>
    
    <!-- 选择模式下的全选 -->
    <div class="select-all-bar" v-if="selectMode && playlists.length > 0">
      <label class="checkbox-label">
        <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
        全选
      </label>
    </div>

    <div class="playlists-list" v-if="playlists.length > 0">
      <liquid-card 
        v-for="playlist in playlists" 
        :key="playlist.id" 
        class="playlist-item"
        :class="{ 'selected': selectedIds.includes(playlist.id) }"
        @click="selectMode ? toggleSelect(playlist.id) : goToPlaylist(playlist.id)"
        border-radius="12px"
      >
        <div class="playlist-content-wrapper">
          <!-- 选择模式下显示勾选框 -->
          <div class="checkbox-wrapper" v-if="selectMode" @click.stop>
            <input 
              type="checkbox" 
              :checked="selectedIds.includes(playlist.id)"
              @change="toggleSelect(playlist.id)"
            />
          </div>
          <div class="playlist-cover" :style="{ backgroundImage: `url(${thumb(playlist.cover || defaultCover, 300)})` }"></div>
          <div class="playlist-info">
            <div class="playlist-name">{{ playlist.name }}</div>
            <div class="playlist-count">{{ playlist.song_count }} 首</div>
          </div>
          <div class="playlist-actions" @click.stop v-if="!selectMode">
            <i class="fa fa-trash" @click="confirmDelete(playlist)"></i>
          </div>
        </div>
      </liquid-card>
    </div>

    <div class="empty-state" v-else>
      <i class="fa fa-music"></i>
      <p>还没有歌单，创建一个吧</p>
    </div>
  </div>
</template>

<script>
import { getMyPlaylists, createPlaylist, deletePlaylist, exportPlaylists, importPlaylists } from '../api/userApi'
import { ElMessage } from 'element-plus/es/components/message'
import { ElMessageBox } from 'element-plus/es/components/message-box'
import { thumb } from '../utils/imgThumb'
import ImportFromNetEasePopup from '../components/ImportFromNetEasePopup.vue'
import LiquidCard from '../components/LiquidCard.vue'

export default {
  name: 'MyPlaylists',
  // Trigger rebuild for styles
  components: {
    ImportFromNetEasePopup,
    LiquidCard
  },
  data() {
    return {
      playlists: [],
      newPlaylistName: '',
      defaultCover: 'https://p2.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg',
      selectMode: false,
      selectedIds: [],
      showImportMenu: false,
      showNetEaseImport: false
    }
  },
  computed: {
    isAllSelected() {
      return this.playlists.length > 0 && this.selectedIds.length === this.playlists.length
    }
  },
  methods: {
    thumb,
    async loadPlaylists() {
      try {
        const res = await getMyPlaylists()
        if (res.data.code === 200) {
          this.playlists = res.data.data
        }
      } catch (err) {
        console.error('Load playlists error:', err)
      }
    },
    async createNewPlaylist() {
      if (!this.newPlaylistName.trim()) return
      
      try {
        const res = await createPlaylist(this.newPlaylistName.trim())
        if (res.data.code === 200) {
          this.newPlaylistName = ''
          this.loadPlaylists()
          ElMessage.success('创建成功')
        }
      } catch (err) {
        ElMessage.error('创建失败')
      }
    },
    async confirmDelete(playlist) {
      try {
        await ElMessageBox.confirm(`确定删除歌单 "${playlist.name}"？`, '删除确认', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        const res = await deletePlaylist(playlist.id)
        if (res.data.code === 200) {
          this.loadPlaylists()
          ElMessage.success('删除成功')
        }
      } catch (err) {
        if (err !== 'cancel') {
          ElMessage.error('删除失败')
        }
      }
    },
    goToPlaylist(id) {
      this.$router.push(`/my-playlists/${id}`)
    },
    // 选择模式相关方法
    enterSelectMode() {
      this.selectMode = true
      this.selectedIds = []
    },
    cancelSelect() {
      this.selectMode = false
      this.selectedIds = []
    },
    toggleSelect(id) {
      const index = this.selectedIds.indexOf(id)
      if (index > -1) {
        this.selectedIds.splice(index, 1)
      } else {
        this.selectedIds.push(id)
      }
    },
    toggleSelectAll() {
      if (this.isAllSelected) {
        this.selectedIds = []
      } else {
        this.selectedIds = this.playlists.map(p => p.id)
      }
    },
    async confirmExport() {
      if (this.selectedIds.length === 0) return
      
      try {
        // 获取所有歌单数据
        const res = await exportPlaylists()
        if (res.data.code === 200) {
          // 只导出选中的歌单
          const allData = res.data.data
          const filteredPlaylists = allData.playlists.filter(p => 
            this.selectedIds.includes(p.id)
          )
          
          const exportData = {
            ...allData,
            playlists: filteredPlaylists
          }
          
          const dataStr = JSON.stringify(exportData, null, 2)
          const blob = new Blob([dataStr], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `neon-playlists-${new Date().toISOString().split('T')[0]}.json`
          link.click()
          URL.revokeObjectURL(url)
          
          ElMessage.success(`成功导出 ${filteredPlaylists.length} 个歌单`)
          this.cancelSelect()
        }
      } catch (err) {
        ElMessage.error('导出失败')
      }
    },
    // 导入相关方法
    openNetEaseImport() {
      this.showImportMenu = false
      this.showNetEaseImport = true
    },
    triggerJsonImport() {
      this.showImportMenu = false
      this.$refs.importInput.click()
    },
    async handleImport(e) {
      const file = e.target.files[0]
      if (!file) return
      
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        if (!data.playlists) {
          ElMessage.error('无效的导入文件')
          return
        }
        
        const res = await importPlaylists(data)
        if (res.data.code === 200) {
          this.loadPlaylists()
          ElMessage.success(res.data.msg)
        }
      } catch (err) {
        ElMessage.error('导入失败')
      } finally {
        e.target.value = ''
      }
    }
  },
  mounted() {
    this.loadPlaylists()
  }
}
</script>

<style lang="scss" scoped>
.my-playlists-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h1 {
    margin: 0;
    font-size: 24px;
  }
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  
  .select-hint {
    font-size: 14px;
    color: #666;
  }
  
  button {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
    
    i { font-size: 12px; }
  }
  
  .export-btn {
    background: #52c41a;
    color: white;
    &:hover { background: #73d13d; }
  }
  
  .import-dropdown {
    position: relative;
    
    .import-btn {
      background: #1890ff;
      color: white;
      &:hover { background: #40a9ff; }
    }
    
    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 6px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      z-index: 100;
      min-width: 160px;
    }
    
    .dropdown-item {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 14px;
      white-space: nowrap;
      
      &:hover {
        background: #f5f5f5;
      }
      
      i {
        width: 16px;
        color: #666;
      }
    }
  }
  
  .cancel-btn {
    background: #f5f5f5;
    color: #666;
    &:hover { background: #e8e8e8; }
  }
  
  .confirm-export-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    &:not(:disabled):hover {
      transform: scale(1.02);
    }
  }
}

.select-all-bar {
  margin-bottom: 15px;
  padding: 10px 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    
    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
  }
}

.create-playlist {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  
  input {
    flex: 1;
    padding: 12px 16px;
    border: 1px solid #ddd;
    border-radius: 10px;
    font-size: 15px;
    
    &:focus {
      outline: none;
      border-color: #667eea;
    }
  }
  
  button {
    padding: 12px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.playlists-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.playlist-item {
  padding: 0;
  background: transparent !important; /* Ensure no background interferes */
  margin-bottom: 12px; /* Restore spacing that might have been lost */
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateX(5px);
  }
  
  &.selected {
    filter: brightness(0.95);
  }
}

.playlist-content-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 12px; /* Move padding here */
}

.playlist-item .checkbox-wrapper {
  margin-right: 12px;
  
  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }
}

.playlist-cover {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.playlist-info {
  flex: 1;
  margin-left: 15px;
}

.playlist-name {
  font-size: 15px;
  font-weight: 500;
}

.playlist-count {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}

.playlist-actions {
  i {
    color: #999;
    cursor: pointer;
    padding: 8px;
    transition: color 0.2s;
    
    &:hover {
      color: #f5222d;
    }
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  
  i {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  p {
    font-size: 16px;
  }
}
</style>
