<template>
  <transition name="fade">
    <div v-if="show" class="add-to-playlist-overlay" @click.self="close">
      <div class="add-to-playlist-popup">
        <div class="popup-header">
          <span class="popup-title">添加到歌单</span>
          <div class="popup-close" @click="close">
            <i class="fa fa-times"></i>
          </div>
        </div>

        <div class="popup-source-switch" v-if="hasNetease && hasLocal">
          <button :class="{ active: source === 'netease' }" @click="switchSource('netease')">网易云</button>
          <button :class="{ active: source === 'local' }" @click="switchSource('local')">本地</button>
        </div>

        <div class="create-new">
          <input 
            v-model="newPlaylistName" 
            placeholder="新建歌单..."
            @keyup.enter="createAndAdd"
          />
          <button @click="createAndAdd" :disabled="!newPlaylistName.trim()">
            <i class="fa fa-plus"></i>
          </button>
        </div>
        
        <div class="playlists-list" v-if="playlists.length > 0">
          <div 
            v-for="playlist in playlists" 
            :key="playlist.id" 
            class="playlist-option"
            @click="addToPlaylist(playlist)"
          >
            <div class="playlist-cover" :style="{ backgroundImage: `url(${thumb(playlist.cover || defaultCover, 100)})` }"></div>
            <div class="playlist-name">{{ playlist.name }}</div>
            <div class="playlist-count">{{ playlist.song_count }} 首</div>
          </div>
        </div>
        
        <div class="empty-state" v-else>
          <p>还没有歌单，新建一个吧</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { getMyPlaylists, createPlaylist, addSongToPlaylist } from '../api/userApi'
import { getNeteaseUserPlaylists, createNeteasePlaylist, addTracksToNeteasePlaylist } from '../api/neteaseUserApi'
import { isNeteaseLoggedIn, getNeteaseProfile } from '../utils/neteaseAuth'
import { ElMessage } from 'element-plus/es/components/message'
import { thumb } from '../utils/imgThumb'

export default {
  name: 'AddToPlaylistPopup',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    song: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      playlists: [],
      newPlaylistName: '',
      defaultCover: 'https://p2.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg',
      // 目标歌单来源：netease=网易云账号歌单，local=自建账号歌单
      source: 'local',
      hasNetease: false,
      hasLocal: false
    }
  },
  watch: {
    show(val) {
      if (val) {
        this.hasNetease = isNeteaseLoggedIn()
        this.hasLocal = !!localStorage.getItem('auth_token')
        this.source = this.hasNetease ? 'netease' : 'local'
        this.loadPlaylists()
      }
    }
  },
  methods: {
    thumb,
    switchSource(source) {
      if (this.source === source) return
      this.source = source
      this.playlists = []
      this.loadPlaylists()
    },
    async loadPlaylists() {
      try {
        if (this.source === 'netease') {
          const profile = getNeteaseProfile()
          if (!profile || !profile.userId) return
          const res = await getNeteaseUserPlaylists(profile.userId)
          if (res.data.code === 200) {
            // 只能往自己创建的歌单里加歌，收藏的歌单不显示
            this.playlists = (res.data.playlist || [])
              .filter(p => p.creator && p.creator.userId === profile.userId)
              .map(p => ({ id: p.id, name: p.name, cover: p.coverImgUrl, song_count: p.trackCount }))
          }
          return
        }
        const res = await getMyPlaylists()
        if (res.data.code === 200) {
          this.playlists = res.data.data
        }
      } catch (err) {
        console.error('Load playlists error:', err)
      }
    },
    async createAndAdd() {
      if (!this.newPlaylistName.trim()) return

      try {
        if (this.source === 'netease') {
          const res = await createNeteasePlaylist(this.newPlaylistName.trim())
          const newId = res.data.playlist?.id || res.data.id
          if (res.data.code === 200 && newId) {
            await this.addToPlaylist({ id: newId, name: this.newPlaylistName.trim() })
            this.newPlaylistName = ''
          } else {
            ElMessage.error(res.data.msg || '创建歌单失败')
          }
          return
        }
        // 创建歌单，用歌曲封面作为默认封面
        const res = await createPlaylist(this.newPlaylistName.trim(), this.song.cover)
        if (res.data.code === 200) {
          const newPlaylist = res.data.data
          await this.addToPlaylist(newPlaylist)
          this.newPlaylistName = ''
        }
      } catch (err) {
        ElMessage.error('创建歌单失败')
      }
    },
    async addToPlaylist(playlist) {
      if (!this.song || !this.song.id) {
        ElMessage.error('歌曲信息不完整')
        return
      }

      try {
        if (this.source === 'netease') {
          const res = await addTracksToNeteasePlaylist(playlist.id, this.song.id)
          if (res.data.code === 200 || res.data.body?.code === 200) {
            ElMessage.success(`已添加到「${playlist.name}」`)
            this.close()
          } else if (res.data.code === 502) {
            ElMessage.warning('歌曲已在该歌单中')
          } else {
            ElMessage.error(res.data.msg || res.data.message || '添加失败')
          }
          return
        }
        const res = await addSongToPlaylist(playlist.id, this.song)
        if (res.data.code === 200) {
          ElMessage.success(`已添加到「${playlist.name}」`)
          this.close()
        }
      } catch (err) {
        ElMessage.error('添加失败')
      }
    },
    close() {
      this.$emit('close')
    }
  }
}
</script>

<style lang="scss" scoped>
.add-to-playlist-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-to-playlist-popup {
  width: 320px;
  max-height: 60vh;
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
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  
  .popup-title {
    font-size: 16px;
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

.create-new {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  
  input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    
    &:focus {
      outline: none;
      border-color: #667eea;
    }
  }
  
  button {
    padding: 10px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.playlists-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.playlist-option {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
}

.playlist-cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.playlist-name {
  flex: 1;
  margin-left: 12px;
  font-size: 14px;
}

.playlist-count {
  font-size: 12px;
  color: #999;
}

.empty-state {
  padding: 30px;
  text-align: center;
  color: #999;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.popup-source-switch {
  display: flex;
  background: rgba(102, 126, 234, 0.12);
  border-radius: 10px;
  padding: 3px;
  margin-bottom: 12px;

  button {
    flex: 1;
    padding: 7px 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #666;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
  }
}
</style>
