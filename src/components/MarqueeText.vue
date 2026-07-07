<template>
  <div class="marquee-text" ref="box" :class="{ 'is-scrolling': overflow }">
    <div class="marquee-track" ref="inner">
      <span class="marquee-item" ref="text">{{ text }}</span>
      <span class="marquee-item" v-if="overflow" aria-hidden="true">{{ text }}</span>
    </div>
  </div>
</template>

<script>
// Apple Music 式跑马灯：文本超出容器宽度才滚动——开头停 2 秒，整行左移，
// 第二份相同内容无缝跟进滑入，回到开头再停，循环往复；滚动时两端渐变淡出。
// 用 Web Animations API 而非 CSS keyframes：停留时长固定 2s，
// 而滚动时长随文本长度变化，keyframe 的百分比断点只能在 JS 里按比例算。
//
// 多行同步：每次测量后 emit('measure', 自然周期ms)；父组件取各行最大值
// 通过 cycle 传回来，所有行都用同一周期动画（短行滚得慢一点），
// 停留、起步、归位的时刻完全一致。
const GAP = 48          // 两份内容的间距(px)，须与样式里的 gap 一致
const SPEED = 40        // 滚动速度(px/s)
const PAUSE = 2000      // 每轮开头的停留时长(ms)

export default {
  name: 'MarqueeText',
  props: {
    text: { type: String, default: '' },
    // 外部指定的循环总时长(ms)，用于多行同步；0 表示各自为政
    cycle: { type: Number, default: 0 }
  },
  emits: ['measure'],
  data() {
    return {
      overflow: false,
      anim: null,
      dist: 0,
      naturalCycle: 0
    }
  },
  watch: {
    text() { this.restart() },
    cycle() { this.play() }
  },
  mounted() {
    this.restart()
    window.addEventListener('resize', this.restart)
  },
  beforeUnmount() {
    this.stop()
    window.removeEventListener('resize', this.restart)
  },
  methods: {
    stop() {
      if (this.anim) {
        this.anim.cancel()
        this.anim = null
      }
    },
    // 重新测量（文本变化/窗口尺寸变化时）
    restart() {
      this.stop()
      this.overflow = false
      this.$nextTick(() => {
        const box = this.$refs.box
        const textEl = this.$refs.text
        if (!box || !textEl) return
        const textWidth = textEl.offsetWidth
        if (textWidth <= box.clientWidth) {
          this.dist = 0
          this.naturalCycle = 0
          this.$emit('measure', 0)
          return
        }

        this.overflow = true
        this.dist = textWidth + GAP
        this.naturalCycle = PAUSE + (this.dist / SPEED) * 1000
        this.$emit('measure', this.naturalCycle)
        // 等第二份内容渲染后再启动动画
        this.$nextTick(() => this.play())
      })
    },
    // 仅重启动画（周期变化时不必重新测量）
    play() {
      this.stop()
      if (!this.overflow || !this.$refs.inner) return
      const total = Math.max(this.cycle, this.naturalCycle)
      this.anim = this.$refs.inner.animate(
        [
          { transform: 'translateX(0)', offset: 0 },
          { transform: 'translateX(0)', offset: PAUSE / total },
          { transform: `translateX(-${this.dist}px)`, offset: 1 }
        ],
        { duration: total, iterations: Infinity }
      )
    }
  }
}
</script>

<style scoped>
.marquee-text {
  overflow: hidden;
  white-space: nowrap;
  max-width: 100%;
  text-align: left;
}

.marquee-track {
  display: inline-flex;
  gap: 48px; /* 与脚本里的 GAP 保持一致 */
  will-change: transform;
}

.marquee-item {
  flex-shrink: 0;
}

/* 滚动时两端渐变淡出 */
.is-scrolling {
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 16px, #000 calc(100% - 28px), transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 16px, #000 calc(100% - 28px), transparent 100%);
}
</style>
