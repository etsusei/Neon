<template>
  <!-- teleport 到 body：祖先的 transform/backdrop-filter 会劫持 fixed 定位，
       弹窗会随 hover 状态在"内容区居中"和"视口居中"之间跳动 -->
  <teleport to="body">
  <transition name="fade">
    <div v-if="show" class="add-to-playlist-overlay" @click.self="close">
      <div class="atp-popup">
        <!-- 液态玻璃四层结构，与 DownloadQualityPopup/LiquidCard 保持一致 -->
        <div class="atp-glass-effect" v-liquid-glass></div>
        <div class="atp-glass-tint"></div>
        <div class="atp-glass-shine"></div>
        <div class="atp-glass-content">
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
    </div>
  </transition>
  </teleport>
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

/* 液态玻璃容器：结构与 DownloadQualityPopup/LiquidCard 一致(effect/tint/shine/content 四层) */
.atp-popup {
  position: relative;
  isolation: isolate;
  width: 320px;
  max-height: 60vh;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
  color: rgba(0, 0, 0, 0.85);
  display: flex;
}

.atp-glass-effect {
  position: absolute;
  z-index: 0;
  inset: 0;
  pointer-events: none;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: url(#glass-distortion) blur(24px);
  -webkit-backdrop-filter: url(#glass-distortion) blur(24px);
}

.atp-glass-tint {
  position: absolute;
  z-index: 1;
  inset: 0;
  pointer-events: none;
  background-color: rgba(255, 255, 255, 0.45);
  transition: background-color 0.5s ease;
}

.atp-glass-shine {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: inherit;
  box-shadow:
    inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5),
    inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5);
}

.atp-glass-content {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}

.popup-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);

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
    transition: background 0.2s;

    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
  }
}

.create-new {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  input {
    flex: 1;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 10px;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.5);
    color: inherit;

    &::placeholder {
      color: rgba(0, 0, 0, 0.35);
    }

    &:focus {
      outline: none;
      border-color: #667eea;
      background: rgba(255, 255, 255, 0.7);
    }
  }

  button {
    padding: 10px 16px;
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
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 0;
}

.playlist-option {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.06);
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
  text-align: left;
}

.playlist-count {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
}

.empty-state {
  padding: 30px;
  text-align: center;
  color: rgba(0, 0, 0, 0.4);
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
  margin: 12px 16px 0;

  button {
    flex: 1;
    padding: 7px 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: rgba(0, 0, 0, 0.55);
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

<!-- 暗色模式覆盖：弹窗 teleport 到 body，取不到 .app-container 上的变量，用 body 上的类名适配 -->
<style lang="scss">
body.dark-mode-active {
  .atp-popup {
    color: #e0e0e0;
  }

  .atp-glass-tint {
    background-color: rgba(23, 23, 23, 0.75);
  }

  .atp-glass-shine {
    box-shadow:
      inset 2px 2px 1px 0 rgba(255, 255, 255, 0.1),
      inset -1px -1px 1px 1px rgba(255, 255, 255, 0.1);
  }

  .atp-popup .popup-header {
    border-bottom-color: rgba(255, 255, 255, 0.1);

    .popup-close:hover {
      background: rgba(255, 255, 255, 0.12);
    }
  }

  .atp-popup .create-new {
    border-bottom-color: rgba(255, 255, 255, 0.08);

    input {
      border-color: rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.08);
      color: #e0e0e0;

      &::placeholder {
        color: rgba(255, 255, 255, 0.35);
      }
    }
  }

  .atp-popup .playlist-option:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .atp-popup .playlist-count,
  .atp-popup .empty-state {
    color: rgba(255, 255, 255, 0.45);
  }

  .atp-popup .popup-source-switch {
    background: rgba(255, 255, 255, 0.08);

    button {
      color: rgba(255, 255, 255, 0.55);

      &.active {
        color: white;
      }
    }
  }
}
</style>
