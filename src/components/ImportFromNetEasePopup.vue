<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="show" class="import-overlay" @click.self="close">
        <div class="import-popup">
          <div class="popup-header">
            <span class="popup-title">从网易云导入</span>
            <div class="popup-close" @click="close">
              <i class="fa fa-times"></i>
            </div>
          </div>
          
          <!-- 搜索区域 -->
          <div class="search-section">
            <input 
              v-model="userId" 
              placeholder="输入网易云用户ID"
              @keyup.enter="searchPlaylists"
            />
            <button @click="searchPlaylists" :disabled="!userId.trim() || searching">
              <i class="fa" :class="searching ? 'fa-spinner fa-spin' : 'fa-search'"></i>
              {{ searching ? '查询中...' : '查询' }}
            </button>
          </div>
          
          <div class="hint">
            <i class="fa fa-info-circle"></i>
            在网易云音乐中打开用户主页，URL中的数字就是用户ID
          </div>
          
          <!-- 歌单列表 -->
          <div class="playlists-section" v-if="playlists.length > 0">
            <div class="select-bar">
              <label class="checkbox-label">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
                全选 ({{ selectedIds.length }}/{{ playlists.length }})
              </label>
            </div>
            
            <div class="playlists-list">
              <div 
                v-for="playlist in playlists" 
                :key="playlist.id" 
                class="playlist-item"
                :class="{ selected: selectedIds.includes(playlist.id) }"
                @click="toggleSelect(playlist.id)"
              >
                <input 
                  type="checkbox" 
                  :checked="selectedIds.includes(playlist.id)"
                  @click.stop
                  @change="toggleSelect(playlist.id)"
                />
                <div class="playlist-cover" :style="{ backgroundImage: `url(${thumb(playlist.coverImgUrl, 100)})` }"></div>
                <div class="playlist-info">
                  <div class="playlist-name">{{ playlist.name }}</div>
                  <div class="playlist-meta">{{ playlist.trackCount }} 首</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="empty-state" v-else-if="searched && !searching">
            <p>未找到歌单或该用户没有公开歌单</p>
          </div>
          
          <!-- 导入按钮 -->
          <div class="action-bar" v-if="playlists.length > 0">
            <div class="progress-info" v-if="importing">
              <div class="progress-text">
                正在导入: {{ currentPlaylistName }}
              </div>
              <div class="progress-detail">
                歌单 {{ importProgress + 1 }}/{{ selectedIds.length }} · 歌曲 {{ songProgress }}/{{ songTotal }}
              </div>
            </div>
            <button 
              class="import-btn" 
              @click="importSelected" 
              :disabled="selectedIds.length === 0 || importing"
            >
              <i class="fa" :class="importing ? 'fa-spinner fa-spin' : 'fa-download'"></i>
              {{ importing ? '导入中...' : `导入选中 (${selectedIds.length})` }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { createPlaylist, addSongToPlaylist } from '../api/userApi'
import { apiClient } from '../api/http'
import { ElMessage } from 'element-plus/es/components/message'
import { thumb } from '../utils/imgThumb'

export default {
  name: 'ImportFromNetEasePopup',
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      userId: '',
      playlists: [],
      selectedIds: [],
      searching: false,
      searched: false,
      importing: false,
      importProgress: 0,
      currentPlaylistName: '',
      songProgress: 0,
      songTotal: 0
    }
  },
  computed: {
    isAllSelected() {
      return this.playlists.length > 0 && this.selectedIds.length === this.playlists.length
    }
  },
  methods: {
    thumb,
    async searchPlaylists() {
      if (!this.userId.trim()) return
      
      this.searching = true
      this.searched = false
      this.playlists = []
      this.selectedIds = []
      
      try {
        const res = await apiClient.get(`user/playlist?uid=${encodeURIComponent(this.userId.trim())}`)
        if (res.data.code === 200 && res.data.playlist) {
          // 过滤掉"喜欢的音乐"等系统歌单，只保留用户创建的
          this.playlists = res.data.playlist.filter(p => p.creator.userId == this.userId)
        }
      } catch (err) {
        console.error('Search error:', err)
        ElMessage.error('查询失败，请检查用户ID')
      } finally {
        this.searching = false
        this.searched = true
      }
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
    async importSelected() {
      if (this.selectedIds.length === 0) return
      
      this.importing = true
      this.importProgress = 0
      
      try {
        for (const playlistId of this.selectedIds) {
          const playlist = this.playlists.find(p => p.id === playlistId)
          if (!playlist) continue
          
          // 获取歌单详情（包含 trackIds）
          const detailRes = await apiClient.get(`playlist/detail?id=${playlistId}`)
          if (detailRes.data.code !== 200) continue
          
          const detail = detailRes.data.playlist
          const trackIds = detail.trackIds || []
          
          if (trackIds.length === 0) {
            this.importProgress++
            continue
          }
          
          // 批量获取歌曲详情（每次最多500首）
          const ids = trackIds.map(t => t.id).join(',')
          const songRes = await apiClient.get(`song/detail?ids=${ids}`)
          if (songRes.data.code !== 200) continue
          
          // 按 trackIds 的原始顺序排列歌曲
          const songsMap = new Map()
          for (const song of (songRes.data.songs || [])) {
            songsMap.set(song.id, song)
          }
          const tracks = trackIds.map(t => songsMap.get(t.id)).filter(Boolean)
          
          // 创建本地歌单
          const createRes = await createPlaylist(playlist.name, thumb(playlist.coverImgUrl, 300))
          if (createRes.data.code !== 200) continue
          
          const newPlaylistId = createRes.data.data.id
          
          // 更新进度显示
          this.currentPlaylistName = playlist.name
          this.songProgress = 0
          this.songTotal = tracks.length
          
          // 反向添加歌曲（因为后端按 added_at DESC 排序，所以最后添加的会显示在最前）
          // 这样导入后显示顺序就和原歌单一致
          for (let i = tracks.length - 1; i >= 0; i--) {
            const track = tracks[i]
            const song = {
              id: track.id,
              name: track.name,
              artist: track.ar && track.ar[0] ? track.ar[0].name : '',
              album: track.al ? track.al.name : '',
              cover: track.al ? track.al.picUrl : ''
            }
            await addSongToPlaylist(newPlaylistId, song)
            this.songProgress = tracks.length - i
            
            // 每首歌之间等待 50ms
            if (i > 0) {
              await new Promise(r => setTimeout(r, 50))
            }
          }
          
          this.importProgress++
        }
        
        ElMessage.success(`成功导入 ${this.importProgress} 个歌单`)
        this.$emit('imported')
        this.close()
      } catch (err) {
        console.error('Import error:', err)
        ElMessage.error('导入失败')
      } finally {
        this.importing = false
      }
    },
    close() {
      this.userId = ''
      this.playlists = []
      this.selectedIds = []
      this.searched = false
      this.$emit('close')
    }
  }
}
</script>

<style lang="scss" scoped>
.import-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.import-popup {
  width: 420px;
  max-height: 70vh;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.popup-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  
  .popup-title {
    font-size: 17px;
    font-weight: 600;
  }
  
  .popup-close {
    margin-left: auto;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 50%;
    
    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
  }
}

.search-section {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  
  input {
    flex: 1;
    padding: 12px 14px;
    border: 2px solid #eee;
    border-radius: 10px;
    font-size: 14px;
    
    &:focus {
      outline: none;
      border-color: #667eea;
    }
  }
  
  button {
    padding: 12px 18px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.hint {
  padding: 0 20px 12px;
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 6px;
}

.playlists-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.select-bar {
  padding: 10px 20px;
  background: rgba(102, 126, 234, 0.1);
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
  }
}

.playlists-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.playlist-item {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(0, 0, 0, 0.03);
  }
  
  &.selected {
    background: rgba(102, 126, 234, 0.1);
  }
  
  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    margin-right: 12px;
    cursor: pointer;
  }
}

.playlist-cover {
  width: 45px;
  height: 45px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.playlist-info {
  margin-left: 12px;
  flex: 1;
  min-width: 0;
}

.playlist-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-meta {
  font-size: 12px;
  color: #999;
  margin-top: 3px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #999;
}

.action-bar {
  padding: 16px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.progress-info {
  margin-bottom: 12px;
  text-align: center;
  
  .progress-text {
    font-size: 13px;
    color: #333;
    font-weight: 500;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .progress-detail {
    font-size: 12px;
    color: #999;
  }
}

.import-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
