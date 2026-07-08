<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="show" class="dl-overlay" @click.self="close">
        <div class="dl-popup">
          <!-- 液态玻璃三层结构，与 LiquidCard 保持一致 -->
          <div class="dl-glass-effect" v-liquid-glass></div>
          <div class="dl-glass-tint"></div>
          <div class="dl-glass-shine"></div>
          <div class="dl-glass-content">
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
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 液态玻璃容器：结构与 LiquidCard 一致(effect/tint/shine/content 四层) */
.dl-popup {
  position: relative;
  isolation: isolate;
  width: 360px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
  color: rgba(0, 0, 0, 0.85);
  --dl-accent: #1f6f64;
  --dl-accent-strong: #164c45;
  --dl-accent-soft: rgba(31, 111, 100, 0.14);
  --dl-button-start: #172321;
  --dl-button-mid: #1f6f64;
  --dl-button-end: #b49a62;
  --dl-button-shadow: rgba(31, 111, 100, 0.28);
}

.dl-glass-effect {
  position: absolute;
  z-index: 0;
  inset: 0;
  pointer-events: none;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: url(#glass-distortion) blur(24px);
  -webkit-backdrop-filter: url(#glass-distortion) blur(24px);
}

.dl-glass-tint {
  position: absolute;
  z-index: 1;
  inset: 0;
  pointer-events: none;
  background-color: rgba(255, 255, 255, 0.45);
  transition: background-color 0.5s ease;
}

.dl-glass-shine {
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

.dl-glass-content {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);

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
    transition: background 0.2s;

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
  color: rgba(0, 0, 0, 0.6);

  i {
    color: var(--dl-accent);
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
  color: rgba(0, 0, 0, 0.45);
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
  border: 1.5px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(0, 0, 0, 0.25);
  }

  &.active {
    border-color: var(--dl-accent);
    background: var(--dl-accent-soft);
    color: var(--dl-accent-strong);
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
  border: 1.5px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(0, 0, 0, 0.25);
  }

  &.selected {
    border-color: var(--dl-accent);
    background: var(--dl-accent-soft);
  }
}

.level-radio {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(0, 0, 0, 0.25);
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
    background: var(--dl-accent);
  }
}

.level-item.selected .level-radio {
  border-color: var(--dl-accent);
}

.level-name {
  font-size: 14px;
  font-weight: 500;
}

.level-desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 2px;
}

.download-btn {
  width: 100%;
  margin-top: 16px;
  padding: 13px;
  background: linear-gradient(135deg, var(--dl-button-start) 0%, var(--dl-button-mid) 68%, var(--dl-button-end) 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 10px 22px var(--dl-button-shadow);
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 14px 26px var(--dl-button-shadow);
    filter: saturate(1.05);
  }

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
  color: rgba(0, 0, 0, 0.6);
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
    transition: background 0.2s;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .btn-secondary {
    background: rgba(0, 0, 0, 0.08);
    color: rgba(0, 0, 0, 0.75);

    &:hover {
      background: rgba(0, 0, 0, 0.14);
    }
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--dl-button-start) 0%, var(--dl-button-mid) 68%, var(--dl-button-end) 100%);
    color: white;
    box-shadow: 0 8px 18px var(--dl-button-shadow);
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

<!-- 暗色模式覆盖：弹窗 teleport 到 body，取不到 .app-container 上的变量，用 body 上的类名适配 -->
<style lang="scss">
body.dark-mode-active {
  .dl-popup {
    color: #e0e0e0;
    --dl-accent: #66d2bd;
    --dl-accent-strong: #9fe4d6;
    --dl-accent-soft: rgba(102, 210, 189, 0.18);
    --dl-button-start: #101716;
    --dl-button-mid: #1d6b60;
    --dl-button-end: #a98d55;
    --dl-button-shadow: rgba(102, 210, 189, 0.18);
  }

  .dl-glass-tint {
    background-color: rgba(23, 23, 23, 0.75);
  }

  .dl-glass-shine {
    box-shadow:
      inset 2px 2px 1px 0 rgba(255, 255, 255, 0.1),
      inset -1px -1px 1px 1px rgba(255, 255, 255, 0.1);
  }

  .dl-popup .popup-header {
    border-bottom-color: rgba(255, 255, 255, 0.1);

    .popup-close:hover {
      background: rgba(255, 255, 255, 0.12);
    }
  }

  .dl-popup .song-brief {
    color: rgba(255, 255, 255, 0.65);
  }

  .dl-popup .section-label,
  .dl-popup .level-desc {
    color: rgba(255, 255, 255, 0.45);
  }

  .dl-popup .format-tab,
  .dl-popup .level-item {
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.05);

    &:hover {
      border-color: rgba(255, 255, 255, 0.3);
    }
  }

  .dl-popup .format-tab.active {
    border-color: var(--dl-accent);
    background: var(--dl-accent-soft);
    color: var(--dl-accent-strong);
  }

  .dl-popup .level-item.selected {
    border-color: var(--dl-accent);
    background: var(--dl-accent-soft);
  }

  .dl-popup .level-radio {
    border-color: rgba(255, 255, 255, 0.3);
  }

  .dl-popup .level-item.selected .level-radio {
    border-color: var(--dl-accent);
  }

  .dl-popup .fail-desc {
    color: rgba(255, 255, 255, 0.65);
  }

  .dl-popup .btn-secondary {
    background: rgba(255, 255, 255, 0.12);
    color: #e0e0e0;

    &:hover {
      background: rgba(255, 255, 255, 0.18);
    }
  }
}
</style>
