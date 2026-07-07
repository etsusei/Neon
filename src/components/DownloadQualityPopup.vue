<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="show" class="dl-overlay" @click.self="close">
        <div class="dl-popup">
          <div class="popup-header">
            <span class="popup-title">下载歌曲</span>
            <div class="popup-close" @click="close">
              <i class="fa fa-times"></i>
            </div>
          </div>

          <div class="song-brief" v-if="song">
            <i class="fa fa-music"></i>
            <span>{{ song.name }}<template v-if="song.artist"> - {{ song.artist }}</template></span>
          </div>

          <!-- 选择质量和格式 -->
          <div v-if="!failInfo" class="select-section">
            <div class="section-label">格式</div>
            <div class="format-tabs">
              <div
                v-for="f in formats"
                :key="f.key"
                class="format-tab"
                :class="{ active: selectedFormat === f.key }"
                @click="switchFormat(f.key)"
              >{{ f.label }}</div>
            </div>

            <div class="section-label">音质</div>
            <div class="level-list">
              <div
                v-for="opt in currentLevels"
                :key="opt.level"
                class="level-item"
                :class="{ selected: selectedLevel === opt.level }"
                @click="selectedLevel = opt.level"
              >
                <div class="level-radio"><span v-if="selectedLevel === opt.level"></span></div>
                <div class="level-info">
                  <div class="level-name">{{ opt.name }}</div>
                  <div class="level-desc">{{ opt.desc }}</div>
                </div>
              </div>
            </div>

            <button class="download-btn" @click="confirmDownload" :disabled="checking">
              <i class="fa" :class="checking ? 'fa-spinner fa-spin' : 'fa-download'"></i>
              {{ checking ? '正在检查资源...' : '开始下载' }}
            </button>
          </div>

          <!-- 无对应资源 / 下载不了：询问是否重新选择 -->
          <div v-else class="fail-section">
            <div class="fail-icon"><i class="fa fa-exclamation-circle"></i></div>
            <template v-if="failInfo.type === 'mismatch'">
              <div class="fail-title">没有「{{ requestedLabel }}」的资源</div>
              <div class="fail-desc">
                该歌曲实际可下载的音质为：<b>{{ actualLabel }}</b><br />
                是否重新选择质量和格式？
              </div>
              <div class="fail-actions">
                <button class="btn-secondary" @click="failInfo = null">重新选择</button>
                <button class="btn-primary" @click="downloadAnyway" :disabled="checking">
                  下载可用音质
                </button>
              </div>
            </template>
            <template v-else>
              <div class="fail-title">暂时无法获取该歌曲的下载资源</div>
              <div class="fail-desc">可能是所选质量/格式没有对应资源，是否重新选择？</div>
              <div class="fail-actions">
                <button class="btn-secondary" @click="close">取消</button>
                <button class="btn-primary" @click="failInfo = null">重新选择</button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { baseUrl, apiClient } from '../api/http'
import { ElMessage } from 'element-plus/es/components/message'

const LEVEL_LABELS = {
  standard: 'MP3 标准 128kbps',
  higher: 'MP3 较高 192kbps',
  exhigh: 'MP3 极高 320kbps',
  lossless: 'FLAC 无损',
  hires: 'FLAC Hi-Res'
}

export default {
  name: 'DownloadQualityPopup',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    // { id, name, artist }
    song: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      formats: [
        { key: 'mp3', label: 'MP3' },
        { key: 'flac', label: 'FLAC 无损' }
      ],
      levelsByFormat: {
        mp3: [
          { level: 'standard', name: '标准', desc: '128kbps · 体积小' },
          { level: 'higher', name: '较高', desc: '192kbps · 均衡' },
          { level: 'exhigh', name: '极高', desc: '320kbps · 推荐' }
        ],
        flac: [
          { level: 'lossless', name: '无损', desc: 'FLAC · CD 级音质，体积较大' },
          { level: 'hires', name: 'Hi-Res', desc: 'FLAC 24bit · 高解析度，体积最大' }
        ]
      },
      selectedFormat: 'mp3',
      selectedLevel: 'exhigh',
      checking: false,
      failInfo: null
    }
  },
  computed: {
    currentLevels() {
      return this.levelsByFormat[this.selectedFormat] || []
    },
    requestedLabel() {
      return LEVEL_LABELS[this.selectedLevel] || this.selectedLevel
    },
    actualLabel() {
      const actual = this.failInfo && this.failInfo.actual
      if (!actual) return '未知'
      // 后端会尽量返回实际的音质等级，优先用它
      if (actual.level && LEVEL_LABELS[actual.level]) return LEVEL_LABELS[actual.level]
      if (!actual.format) return '未知'
      if (actual.format === 'flac') return 'FLAC 无损'
      const kbps = actual.br ? Math.round(actual.br / 1000) : null
      return kbps ? `MP3 ${kbps}kbps` : 'MP3'
    }
  },
  watch: {
    show(val) {
      // 每次打开重置到选择视图，保留上次选的挡位
      if (val) {
        this.failInfo = null
        this.checking = false
      }
    }
  },
  methods: {
    switchFormat(key) {
      if (this.selectedFormat === key) return
      this.selectedFormat = key
      this.selectedLevel = key === 'flac' ? 'lossless' : 'exhigh'
    },
    async confirmDownload() {
      if (!this.song || this.checking) return
      this.checking = true
      try {
        const res = await apiClient.get(
          `api/music/download/check?id=${this.song.id}&level=${this.selectedLevel}`
        )
        const data = res.data && res.data.data
        if (res.data.code === 200 && data && data.available) {
          if (data.matched) {
            this.triggerDownload()
            ElMessage.success('开始下载...')
            this.close()
          } else {
            // 有资源但音质不满足所选挡位，询问是否重选
            this.failInfo = { type: 'mismatch', actual: data.actual }
          }
        } else {
          this.failInfo = { type: 'unavailable' }
        }
      } catch (err) {
        console.error('Download check error:', err)
        this.failInfo = { type: 'unavailable' }
      } finally {
        this.checking = false
      }
    },
    downloadAnyway() {
      this.triggerDownload()
      ElMessage.success('开始下载...')
      this.close()
    },
    triggerDownload() {
      const filename = this.song.artist
        ? `${this.song.name} - ${this.song.artist}`
        : `${this.song.name}`
      const downloadUrl = `${baseUrl}api/music/download?id=${this.song.id}&name=${encodeURIComponent(filename)}&level=${this.selectedLevel}`

      // 创建隐藏的 iframe 触发下载，避免页面跳转
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = downloadUrl
      document.body.appendChild(iframe)
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 8000)
    },
    close() {
      this.failInfo = null
      this.checking = false
      this.$emit('close')
    }
  }
}
</script>

<style lang="scss" scoped>
.dl-overlay {
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

.dl-popup {
  width: 360px;
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

.song-brief {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px 0;
  font-size: 13px;
  color: #666;

  i {
    color: #667eea;
  }

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.select-section {
  padding: 12px 20px 20px;
}

.section-label {
  font-size: 12px;
  color: #999;
  margin: 12px 0 8px;
}

.format-tabs {
  display: flex;
  gap: 8px;
}

.format-tab {
  flex: 1;
  text-align: center;
  padding: 9px 0;
  border: 2px solid #eee;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #ccc;
  }

  &.active {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.08);
    color: #667eea;
    font-weight: 600;
  }
}

.level-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.level-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border: 2px solid #eee;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #ccc;
  }

  &.selected {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.08);
  }
}

.level-radio {
  width: 18px;
  height: 18px;
  border: 2px solid #ccc;
  border-radius: 50%;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #667eea;
  }
}

.level-item.selected .level-radio {
  border-color: #667eea;
}

.level-name {
  font-size: 14px;
  font-weight: 500;
}

.level-desc {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.download-btn {
  width: 100%;
  margin-top: 16px;
  padding: 13px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

.fail-section {
  padding: 20px;
  text-align: center;
}

.fail-icon {
  font-size: 36px;
  color: #faad14;
  margin-bottom: 10px;
}

.fail-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
}

.fail-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.7;
  margin-bottom: 16px;
}

.fail-actions {
  display: flex;
  gap: 10px;

  button {
    flex: 1;
    padding: 11px 0;
    border-radius: 10px;
    font-size: 14px;
    cursor: pointer;
    border: none;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .btn-secondary {
    background: rgba(0, 0, 0, 0.06);
    color: #333;

    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
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
