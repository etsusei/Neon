/**
 * 物理折射液态玻璃引擎（由 liquid_glass/liquid3 实验固化）
 *
 * 原理：按斯涅尔定律在圆角矩形边缘(bezel)计算光的折射偏移，
 * 烘焙成位移贴图(R=X, G=Y, 128=中性)喂给 feDisplacementMap；
 * R/G/B 三通道用不同 scale 产生边缘色散；高光贴图按法线·光源方向生成。
 *
 * 仅 Chromium 支持 backdrop-filter: url(#svg滤镜)——不支持时本引擎不做任何事，
 * 各组件保留原有的 url(#glass-distortion)/blur CSS 作为降级。
 *
 * 用法：
 *   1. 指令（推荐）：<div class="glass-effect-layer" v-liquid-glass></div>
 *   2. 手动：const detach = attachLiquidGlass(el, { radius: 20 })
 *
 * 默认光学参数来自 liquid3 试验台的人工调参结果。
 */

// ============ 默认参数（liquid3 调参结果） ============
const DEFAULTS = {
  profile: 'convex-squircle',
  bezelWidth: 60,          // 折射边缘带宽度(px)
  refractiveIndex: 2.4,    // 折射率
  thickness: 60,           // 玻璃厚度(px)
  strength: 2.4,           // 位移强度倍率
  invert: false,
  chromaticAberration: 12.5, // 色差(px)
  frost: 4.5,              // 折射后的模糊(px)
  saturation: 1.15,
  specStrength: 2.0,       // 边缘高光强度
  specWidth: 0.05,         // 高光带占 bezel 比例
  lightAngle: -45,         // 光源方向(度)
  dualRim: true,           // 对侧次级缘光
}

export const isLiquidGlassSupported = () => typeof window !== 'undefined' && !!window.chrome

// ============ 边缘高度剖面 ============
const PROFILES = {
  'convex-squircle': t => Math.pow(1 - Math.pow(1 - t, 4), 0.25),
  'convex-circle': t => Math.sqrt(1 - (1 - t) * (1 - t)),
  'concave': t => 1 - Math.sqrt(1 - (1 - t) * (1 - t)),
}

const LUT_SIZE = 127

// 按剖面 + 斯涅尔定律预计算 bezel 内每处的横向偏移(px)
function buildMagnitudeLUT(opts) {
  const fn = PROFILES[opts.profile] || PROFILES['convex-squircle']
  const { bezelWidth, thickness, refractiveIndex: n } = opts
  const lut = new Float32Array(LUT_SIZE)
  const dt = 1 / (LUT_SIZE - 1)

  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i * dt
    const h0 = fn(Math.max(0, t - dt))
    const h1 = fn(Math.min(1, t + dt))
    const slope = ((h1 - h0) * thickness) / (2 * dt * bezelWidth)
    const theta1 = Math.atan(Math.abs(slope))
    const theta2 = Math.asin(Math.sin(theta1) / n)
    const depth = fn(t) * thickness
    lut[i] = Math.tan(theta1 - theta2) * depth * Math.sign(slope)
  }
  return lut
}

// 圆角矩形 SDF
function makeSDF(w, h, r) {
  const cx = w / 2, cy = h / 2
  const hw = w / 2, hh = h / 2
  const rr = Math.min(r, hw, hh)
  return (px, py) => {
    const qx = Math.abs(px - cx) - (hw - rr)
    const qy = Math.abs(py - cy) - (hh - rr)
    const ax = Math.max(qx, 0), ay = Math.max(qy, 0)
    return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - rr
  }
}

// 位移贴图。
// 性能：内部按降采样分辨率生成(位移场是平滑渐变，feImage 拉伸无损观感)，
// 大面板的生成成本从 ~70 万像素降到 ~20 万以内
const MAP_MAX_DIM = 480

function renderDisplacementMap(w, h, r, opts) {
  const q = Math.min(1, MAP_MAX_DIM / Math.max(w, h))
  const mw = Math.max(2, Math.round(w * q))
  const mh = Math.max(2, Math.round(h * q))

  const lut = buildMagnitudeLUT(opts)
  let maxMag = 0
  for (let i = 0; i < LUT_SIZE; i++) maxMag = Math.max(maxMag, Math.abs(lut[i]))
  maxMag = maxMag || 1
  const sdf = makeSDF(mw, mh, r * q)
  const sign = opts.invert ? -1 : 1
  const bezel = opts.bezelWidth * q

  const canvas = document.createElement('canvas')
  canvas.width = mw
  canvas.height = mh
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(mw, mh)
  const data = img.data

  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const i = (y * mw + x) * 4
      const d = -sdf(x + 0.5, y + 0.5)
      let rx = 0, ry = 0

      if (d >= 0 && d <= bezel) {
        const t = d / bezel
        const mag = (lut[Math.min(LUT_SIZE - 1, Math.round(t * (LUT_SIZE - 1)))] / maxMag) * sign
        const gx = sdf(x + 1.5, y + 0.5) - sdf(x - 0.5, y + 0.5)
        const gy = sdf(x + 0.5, y + 1.5) - sdf(x + 0.5, y - 0.5)
        const gl = Math.hypot(gx, gy) || 1
        rx = (gx / gl) * mag
        ry = (gy / gl) * mag
      }

      data[i] = Math.round(128 + rx * 127)
      data[i + 1] = Math.round(128 + ry * 127)
      data[i + 2] = 128
      data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return { url: canvas.toDataURL(), maxMag }
}

// 高光贴图（边缘 rim light）
function renderSpecularMap(w, h, r, opts) {
  const sdf = makeSDF(w, h, r)
  const { bezelWidth: bezel, specWidth, specStrength, lightAngle, dualRim } = opts
  const la = (lightAngle * Math.PI) / 180
  const lx = Math.cos(la), ly = Math.sin(la)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(w, h)
  const data = img.data

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const d = -sdf(x + 0.5, y + 0.5)
      let a = 0

      if (d >= 0 && d <= bezel) {
        const t = d / bezel
        const band = Math.pow(Math.max(0, 1 - t / specWidth), 2)
        if (band > 0) {
          const gx = sdf(x + 1.5, y + 0.5) - sdf(x - 0.5, y + 0.5)
          const gy = sdf(x + 0.5, y + 1.5) - sdf(x + 0.5, y - 0.5)
          const gl = Math.hypot(gx, gy) || 1
          const facing = (gx / gl) * lx + (gy / gl) * ly
          const main = Math.pow(Math.max(0, facing), 1.5)
          const rim = dualRim ? Math.pow(Math.max(0, -facing), 2) * 0.45 : 0
          a = Math.min(1, (main + rim) * band * specStrength)
        }
      }

      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = Math.round(a * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL()
}

// ============ SVG 滤镜管理（按尺寸缓存 + 引用计数） ============
const SVG_NS = 'http://www.w3.org/2000/svg'
let defsEl = null
let uidCounter = 0
const filterCache = new Map() // key -> { id, refs, el }

function ensureDefs() {
  if (defsEl) return defsEl
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.cssText = 'position:fixed;width:0;height:0;pointer-events:none;'
  defsEl = document.createElementNS(SVG_NS, 'defs')
  svg.appendChild(defsEl)
  document.body.appendChild(svg)
  return defsEl
}

function fe(name, attrs) {
  const el = document.createElementNS(SVG_NS, name)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  return el
}

const CHANNEL_MATRIX = {
  R: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
  G: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
  B: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
}

// 大面积元素自动关闭色差：滤镜链从 3 次位移采样降到 1 次（滚动性能的大头），
// 大面板上色差本来就几乎不可见，小弹窗/按钮保留完整效果
const CA_AREA_LIMIT = 200000 // px²

function buildFilter(id, w, h, r, opts) {
  const { url: mapUrl, maxMag } = renderDisplacementMap(w, h, r, opts)
  const scalePx = maxMag * opts.strength
  const ca = w * h > CA_AREA_LIMIT ? 0 : opts.chromaticAberration

  const filter = fe('filter', {
    id, x: 0, y: 0, width: w, height: h,
    filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB',
  })
  filter.appendChild(fe('feImage', { href: mapUrl, x: 0, y: 0, width: w, height: h, result: 'map' }))

  if (ca > 0.01) {
    const scales = { R: scalePx + ca, G: scalePx, B: scalePx - ca }
    for (const ch of ['R', 'G', 'B']) {
      filter.appendChild(fe('feDisplacementMap', {
        in: 'SourceGraphic', in2: 'map', scale: scales[ch],
        xChannelSelector: 'R', yChannelSelector: 'G', result: `disp${ch}`,
      }))
      filter.appendChild(fe('feColorMatrix', {
        in: `disp${ch}`, type: 'matrix', values: CHANNEL_MATRIX[ch], result: `ch${ch}`,
      }))
    }
    filter.appendChild(fe('feBlend', { in: 'chR', in2: 'chG', mode: 'screen', result: 'rg' }))
    filter.appendChild(fe('feBlend', { in: 'rg', in2: 'chB', mode: 'screen', result: 'refracted' }))
  } else {
    filter.appendChild(fe('feDisplacementMap', {
      in: 'SourceGraphic', in2: 'map', scale: scalePx,
      xChannelSelector: 'R', yChannelSelector: 'G', result: 'refracted',
    }))
  }

  filter.appendChild(fe('feGaussianBlur', { in: 'refracted', stdDeviation: opts.frost, result: 'frosted' }))
  filter.appendChild(fe('feColorMatrix', { in: 'frosted', type: 'saturate', values: opts.saturation }))
  // 高光不进滤镜链：作为 effect 层的 CSS 背景图一次合成，滚动时零开销
  return filter
}

// 全部实例共用 DEFAULTS 时缓存键只含几何量；传了自定义光学参数就并进键里
function cacheKey(w, h, r, opts) {
  const custom = opts === DEFAULTS ? '' : JSON.stringify(opts)
  return `${w}|${h}|${r}|${custom}`
}

function acquireFilter(w, h, r, opts) {
  ensureDefs()
  const key = cacheKey(w, h, r, opts)
  let entry = filterCache.get(key)
  if (!entry) {
    const id = `lqg-${++uidCounter}`
    entry = {
      id,
      refs: 0,
      el: buildFilter(id, w, h, r, opts),
      specUrl: renderSpecularMap(w, h, r, opts),
      key,
    }
    defsEl.appendChild(entry.el)
    filterCache.set(key, entry)
  }
  entry.refs++
  return entry
}

function releaseFilter(key) {
  const entry = filterCache.get(key)
  if (!entry) return
  entry.refs--
  if (entry.refs <= 0) {
    entry.el.remove()
    filterCache.delete(key)
  }
}

// 解析元素圆角：自身没有就取父元素（effect 层通常 inset:0 贴在圆角容器里）
function readRadius(el) {
  for (const target of [el, el.parentElement]) {
    if (!target) continue
    const raw = getComputedStyle(target).borderTopLeftRadius
    const v = parseFloat(raw)
    if (!v) continue
    if (raw.endsWith('%')) return (v / 100) * target.clientWidth
    return v
  }
  return 0
}

// ============ 对外 API ============
export function attachLiquidGlass(el, options = {}) {
  if (!isLiquidGlassSupported()) return () => {}
  const opts = Object.keys(options).filter(k => k !== 'radius' && k !== 'disabled').length
    ? { ...DEFAULTS, ...options }
    : DEFAULTS

  let currentKey = null
  let timer = null

  const apply = () => {
    const w = Math.round(el.clientWidth)
    const h = Math.round(el.clientHeight)
    if (!w || !h) return
    const r = Math.round(options.radius != null ? options.radius : readRadius(el))
    const key = cacheKey(w, h, r, opts)
    if (key === currentKey) return
    const entry = acquireFilter(w, h, r, opts)
    if (currentKey) releaseFilter(currentKey)
    currentKey = key
    el.style.backdropFilter = `url(#${entry.id})`
    el.style.webkitBackdropFilter = `url(#${entry.id})`
    // 高光作为本层背景图（画在滤镜结果之上），不占滤镜链的每帧开销
    el.style.backgroundImage = `url(${entry.specUrl})`
    el.style.backgroundSize = '100% 100%'
  }

  // 尺寸变化防抖重建：拖动窗口过程中不反复生成贴图
  const ro = new ResizeObserver(() => {
    clearTimeout(timer)
    timer = setTimeout(apply, 150)
  })
  ro.observe(el)
  apply()

  return () => {
    ro.disconnect()
    clearTimeout(timer)
    if (currentKey) {
      releaseFilter(currentKey)
      currentKey = null
    }
  }
}

// Vue 指令：v-liquid-glass / v-liquid-glass="{ radius: 20, disabled: false }"
export const liquidGlassDirective = {
  mounted(el, binding) {
    const opts = binding.value || {}
    if (opts.disabled) return
    el.__lgDetach = attachLiquidGlass(el, opts)
  },
  unmounted(el) {
    if (el.__lgDetach) {
      el.__lgDetach()
      el.__lgDetach = null
    }
  },
}
