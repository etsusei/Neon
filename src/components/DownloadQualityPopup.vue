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

          <div class="max-quality-tip" v-if="maxLevelLabel">
            <i class="fa fa-signal"></i>
            <span>本曲最高音质：{{ maxLevelLabel }}</span>
          </div>

          <!-- 选择质量和格式 -->
          <div v-if="!failInfo" class="select-section">
            <div class="section-label">格式</div>
            <div class="format-tabs">
              <div
                v-for="f in formats"
                :key="f.key"
                class="format-tab"
                :class="{ active: selectedFormat === f.key, unavailable: !isFormatAvailable(f.key) }"
                @click="switchFormat(f.key)"
              >{{ f.label }}</div>
            </div>

            <div class="section-label">音质</div>
            <div class="level-list">
              <div
                v-for="opt in currentLevels"
                :key="opt.level"
                class="level-item"
                :class="{ selected: selectedLevel === opt.level, unavailable: !isLevelAvailable(opt.level) }"
                @click="selectLevel(opt)"
              >
                <div class="level-radio"><span v-if="selectedLevel === opt.level"></span></div>
                <div class="level-info">
                  <div class="level-name">
                    {{ opt.name }}
                    <span v-if="opt.level === maxLevel" class="max-badge">最高</span>
                  </div>
                  <div class="level-desc">{{ isLevelAvailable(opt.level) ? opt.desc : '该歌曲无此音质资源' }}</div>
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

// 音质从高到低，用于找最高可下挡位
const LEVEL_ORDER = ['hires', 'lossless', 'exhigh', 'higher', 'standard']
const FORMAT_LEVELS = {
  mp3: ['standard', 'higher', 'exhigh'],
  flac: ['lossless', 'hires']
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
      failInfo: null,
      // 各音质挡位是否实际可下载(用 hires 挡位向后端探测一次得出)；null 表示未知，不做限制
      qualityMap: null,
      maxLevel: null
    }
  },
  computed: {
    currentLevels() {
      return this.levelsByFormat[this.selectedFormat] || []
    },
    maxLevelLabel() {
      return this.maxLevel ? LEVEL_LABELS[this.maxLevel] : null
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
        this.fetchQuality()
      }
    }
  },
  methods: {
    isLevelAvailable(level) {
      // 详情还没拿到(或拿失败)时不做限制，保持原有流程
      if (!this.qualityMap) return true
      return !!this.qualityMap[level]
    },
    isFormatAvailable(key) {
      if (!this.qualityMap) return true
      return (FORMAT_LEVELS[key] || []).some(l => this.qualityMap[l])
    },
    async fetchQuality() {
      this.qualityMap = null
      this.maxLevel = null
      if (!this.song || !this.song.id) return
      const songId = this.song.id
      try {
        // 用最高挡位(hires)向后端探测一次，actual 即服务器实际能解析到的最高音质。
        // 不能用 song/detail 的 sq/hr 字段：那只说明资源存在，账号无权限时实际拿不到，
        // 会出现"显示有 FLAC 但下载时说最高 320k"的不一致。
        // 后端按 歌曲+挡位 缓存解析结果，用户之后按最高挡位下载时会直接命中。
        const res = await apiClient.get(`api/music/download/check?id=${songId}&level=hires`)
        const data = res.data && res.data.data
        // 弹窗可能已经关掉或换了歌，丢弃过期结果
        if (!this.song || this.song.id !== songId) return
        if (!(res.data.code === 200 && data && data.available)) return
        const max = this.resolveActualLevel(data.actual)
        if (!max) return
        // maxRank 之后(音质更低)的挡位都可下载，之前(音质更高)的都拿不到
        const maxRank = LEVEL_ORDER.indexOf(max)
        const map = {}
        LEVEL_ORDER.forEach((l, i) => { map[l] = i >= maxRank })
        this.qualityMap = map
        this.maxLevel = max
        this.ensureSelectable()
      } catch (e) {
        // 探测失败就不展示最高音质，也不限制选择
        console.warn('获取歌曲音质信息失败:', e)
      }
    },
    // 把后端返回的实际资源信息归一成挡位：优先用 level 字段，缺失时按格式/码率推断
    resolveActualLevel(actual) {
      if (!actual) return null
      if (actual.level && LEVEL_LABELS[actual.level]) return actual.level
      if (actual.format === 'flac') return 'lossless'
      if (actual.format === 'mp3') {
        if (!actual.br || actual.br >= 300000) return 'exhigh'
        if (actual.br >= 180000) return 'higher'
        return 'standard'
      }
      return null
    },
    // 当前选中的格式/挡位没有资源时，自动落到可用的最高挡位
    ensureSelectable() {
      if (!this.qualityMap) return
      if (!this.isFormatAvailable(this.selectedFormat)) {
        const other = this.selectedFormat === 'mp3' ? 'flac' : 'mp3'
        if (this.isFormatAvailable(other)) this.selectedFormat = other
      }
      if (!this.isLevelAvailable(this.selectedLevel)) {
        const best = LEVEL_ORDER.find(
          l => (FORMAT_LEVELS[this.selectedFormat] || []).includes(l) && this.qualityMap[l]
        )
        if (best) this.selectedLevel = best
      }
    },
    selectLevel(opt) {
      if (!this.isLevelAvailable(opt.level)) return
      this.selectedLevel = opt.level
    },
    switchFormat(key) {
      if (this.selectedFormat === key || !this.isFormatAvailable(key)) return
      this.selectedFormat = key
      this.selectedLevel = key === 'flac' ? 'lossless' : 'exhigh'
      this.ensureSelectable()
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
    async triggerDownload() {
      const filename = this.song.artist
        ? `${this.song.name} - ${this.song.artist}`
        : `${this.song.name}`
      const query = `id=${this.song.id}&level=${this.selectedLevel}`

      // 优先直连网易 CDN 下载：音频不经过服务器中转。
      // 服务器部署在海外时回国带宽极小(几 KB/s)，而网易 CDN 对国内用户是本地网络，
      // 且返回 access-control-allow-origin: *，可以直接 fetch 成 blob 保存。
      try {
        const res = await apiClient.get(`api/music/download/url?${query}`)
        const data = res.data && res.data.data
        if (res.data.code === 200 && data && data.url) {
          const ext = data.format === 'flac' ? 'flac' : 'mp3'
          await this.saveFromUrl(data.url, `${filename}.${ext}`)
          ElMessage.success('下载完成')
          return
        }
      } catch (err) {
        console.warn('直链下载失败，回退服务器代理下载:', err)
      }

      // 回退：服务器代理下载，用隐藏 iframe 触发，避免页面跳转
      const downloadUrl = `${baseUrl}api/music/download?${query}&name=${encodeURIComponent(filename)}`
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = downloadUrl
      document.body.appendChild(iframe)
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 8000)
    },
    async saveFromUrl(url, filename) {
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`fetch failed: ${resp.status}`)
      const blob = await resp.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000)
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

.max-quality-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 20px 0;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--dl-accent-soft);
  font-size: 12px;
  color: var(--dl-accent-strong);

  i {
    font-size: 11px;
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

  &.unavailable {
    opacity: 0.4;
    cursor: not-allowed;

    &:hover {
      border-color: rgba(0, 0, 0, 0.12);
    }
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

  &.unavailable {
    opacity: 0.4;
    cursor: not-allowed;

    &:hover {
      border-color: rgba(0, 0, 0, 0.12);
    }
  }
}

.max-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
  vertical-align: 1px;
  background: var(--dl-accent-soft);
  color: var(--dl-accent-strong);
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

  .dl-popup .format-tab.unavailable:hover,
  .dl-popup .level-item.unavailable:hover {
    border-color: rgba(255, 255, 255, 0.15);
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
