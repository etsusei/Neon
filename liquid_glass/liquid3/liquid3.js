/**
 * Liquid Glass v3 — 物理折射位移贴图实验
 *
 * 与 liquid1(噪声/渐变近似)不同，这里按真实光学推导位移贴图：
 *   1. 玻璃边缘(bezel)有一个高度剖面 h(t)（凸超椭圆/凸圆/凹面/唇边）
 *   2. 垂直入射光在表面按斯涅尔定律折射：sinθ₁ = n·sinθ₂
 *   3. 折射偏角 δ = θ₁ - θ₂，横向偏移 = tanδ × 光在玻璃内走过的深度
 *   4. 偏移量沿圆角矩形 SDF 的法线方向烘焙进 RGBA：R=X 位移，G=Y 位移，128=中性
 *   5. feDisplacementMap 消费贴图；R/G/B 三通道用不同 scale 产生色散(色差)
 *   6. 高光贴图按"表面法线 vs 光源方向"单独生成，screen 混合叠加
 *
 * 仅 Chromium 支持 backdrop-filter: url(#svg滤镜)。
 */
import { Pane } from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.4/dist/tweakpane.min.js'

// ============ 参数 ============
const params = {
  // 尺寸
  width: 360,
  height: 220,
  radius: 40,
  // 光学
  profile: 'convex-squircle', // 边缘高度剖面
  bezelWidth: 32,             // 折射发生的边缘带宽度(px)
  refractiveIndex: 1.5,       // 玻璃折射率
  thickness: 28,              // 玻璃厚度(px)，决定偏移基数
  strength: 1.0,              // 位移强度倍率(1=物理值)
  invert: false,              // 反转位移方向(放大镜⇄缩小镜观感)
  chromaticAberration: 6,     // 色差：R/B 通道 scale 偏移(px)
  // 质感
  frost: 2,                   // 折射后的轻微模糊(px)
  saturation: 1.15,
  tintAlpha: 0.08,            // 白色着色层透明度
  // 高光
  specStrength: 0.8,          // 边缘高光强度
  specWidth: 0.35,            // 高光带占 bezel 的比例
  lightAngle: -45,            // 光源方向(度，-45=左上)
  dualRim: true,              // 对侧再来一圈弱高光(苹果双缘光)
  // 调试
  showMap: false,
  showSpec: false,
}

// ============ 边缘高度剖面 ============
// t: 0=最外缘 → 1=bezel 内侧；返回高度 0→1
const PROFILES = {
  'convex-squircle': t => Math.pow(1 - Math.pow(1 - t, 4), 0.25),
  'convex-circle':   t => Math.sqrt(1 - (1 - t) * (1 - t)),
  'concave':         t => 1 - Math.sqrt(1 - (1 - t) * (1 - t)),
  'lip': t => {
    // 凸起的唇边 + 内侧轻微下陷，smootherstep 过渡
    const s = t * t * t * (t * (t * 6 - 15) + 10)
    const convex = Math.sqrt(1 - (1 - t) * (1 - t))
    return convex * (1 - s) + (0.85 + 0.15 * t) * s
  },
}

// ============ 位移量查找表 ============
// 按剖面 + 斯涅尔定律预计算 bezel 内每个位置的横向偏移(px)，法向直接旋转复用
const LUT_SIZE = 127

function buildMagnitudeLUT() {
  const fn = PROFILES[params.profile]
  const { bezelWidth, thickness, refractiveIndex: n } = params
  const lut = new Float32Array(LUT_SIZE)
  const dt = 1 / (LUT_SIZE - 1)

  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i * dt
    // 数值微分求表面斜率 dh/dx（换算成 px/px）
    const h0 = fn(Math.max(0, t - dt))
    const h1 = fn(Math.min(1, t + dt))
    const slope = ((h1 - h0) * thickness) / (2 * dt * bezelWidth)
    // 垂直入射：入射角 = 表面法线倾角
    const theta1 = Math.atan(Math.abs(slope))
    const theta2 = Math.asin(Math.sin(theta1) / n)
    const delta = theta1 - theta2
    // 光在玻璃内的行程深度 ≈ 该处玻璃高度
    const depth = fn(t) * thickness
    // 斜率为负(凹面内侧)时偏移反向
    lut[i] = Math.tan(delta) * depth * Math.sign(slope)
  }
  return lut
}

// ============ 圆角矩形 SDF ============
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

// ============ 生成位移贴图 ============
function renderDisplacementMap() {
  const { width: w, height: h, bezelWidth } = params
  const lut = buildMagnitudeLUT()
  const maxMag = lut.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1
  const sdf = makeSDF(w, h, params.radius)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(w, h)
  const data = img.data
  const sign = params.invert ? -1 : 1

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const d = -sdf(x + 0.5, y + 0.5) // 内侧为正的到边距离
      let rx = 0, ry = 0

      if (d >= 0 && d <= bezelWidth) {
        const t = d / bezelWidth
        const mag = (lut[Math.min(LUT_SIZE - 1, Math.round(t * (LUT_SIZE - 1)))] / maxMag) * sign
        // SDF 数值梯度 = 指向外侧的法线
        const gx = sdf(x + 1.5, y + 0.5) - sdf(x - 0.5, y + 0.5)
        const gy = sdf(x + 0.5, y + 1.5) - sdf(x + 0.5, y - 0.5)
        const gl = Math.hypot(gx, gy) || 1
        rx = (gx / gl) * mag
        ry = (gy / gl) * mag
      }

      data[i] = Math.round(128 + rx * 127)     // R = X 位移
      data[i + 1] = Math.round(128 + ry * 127) // G = Y 位移
      data[i + 2] = 128
      data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return { url: canvas.toDataURL(), maxMag }
}

// ============ 生成高光贴图 ============
// 边缘带内按 法线·光源方向 计算 rim light，模拟玻璃棱边的镜面反射
function renderSpecularMap() {
  const { width: w, height: h, bezelWidth, specWidth, specStrength, lightAngle, dualRim } = params
  const sdf = makeSDF(w, h, params.radius)
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

      if (d >= 0 && d <= bezelWidth) {
        const t = d / bezelWidth
        // 高光带：靠外缘最亮，往内快速衰减
        const band = Math.pow(Math.max(0, 1 - t / specWidth), 2)
        if (band > 0) {
          const gx = sdf(x + 1.5, y + 0.5) - sdf(x - 0.5, y + 0.5)
          const gy = sdf(x + 0.5, y + 1.5) - sdf(x + 0.5, y - 0.5)
          const gl = Math.hypot(gx, gy) || 1
          // 面向光源的边亮，背光边给一半强度的次级缘光
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

// ============ 组装 SVG 滤镜管线 ============
const SVG_NS = 'http://www.w3.org/2000/svg'
const filterEl = document.getElementById('lg3')

function fe(name, attrs) {
  const el = document.createElementNS(SVG_NS, name)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  return el
}

// 单通道保留矩阵（displaced 三份各取一个通道再 screen 合成 → 色差）
const CHANNEL_MATRIX = {
  R: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
  G: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
  B: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
}

function rebuildFilter(mapUrl, specUrl, scalePx) {
  const { width: w, height: h, chromaticAberration: ca, frost, saturation } = params
  filterEl.setAttribute('width', w)
  filterEl.setAttribute('height', h)
  filterEl.replaceChildren()

  filterEl.appendChild(fe('feImage', { href: mapUrl, x: 0, y: 0, width: w, height: h, result: 'map' }))

  if (ca > 0.01) {
    // 三通道不同 scale → 边缘色散
    const scales = { R: scalePx + ca, G: scalePx, B: scalePx - ca }
    for (const ch of ['R', 'G', 'B']) {
      filterEl.appendChild(fe('feDisplacementMap', {
        in: 'SourceGraphic', in2: 'map', scale: scales[ch],
        xChannelSelector: 'R', yChannelSelector: 'G', result: `disp${ch}`,
      }))
      filterEl.appendChild(fe('feColorMatrix', {
        in: `disp${ch}`, type: 'matrix', values: CHANNEL_MATRIX[ch], result: `ch${ch}`,
      }))
    }
    filterEl.appendChild(fe('feBlend', { in: 'chR', in2: 'chG', mode: 'screen', result: 'rg' }))
    filterEl.appendChild(fe('feBlend', { in: 'rg', in2: 'chB', mode: 'screen', result: 'refracted' }))
  } else {
    filterEl.appendChild(fe('feDisplacementMap', {
      in: 'SourceGraphic', in2: 'map', scale: scalePx,
      xChannelSelector: 'R', yChannelSelector: 'G', result: 'refracted',
    }))
  }

  filterEl.appendChild(fe('feGaussianBlur', { in: 'refracted', stdDeviation: frost, result: 'frosted' }))
  filterEl.appendChild(fe('feColorMatrix', { in: 'frosted', type: 'saturate', values: saturation, result: 'satd' }))
  filterEl.appendChild(fe('feImage', { href: specUrl, x: 0, y: 0, width: w, height: h, result: 'spec' }))
  filterEl.appendChild(fe('feBlend', { in: 'spec', in2: 'satd', mode: 'screen' }))
}

// ============ 应用到面板 ============
const glass = document.getElementById('glass')
const debugMaps = document.getElementById('debugMaps')
const debugDisp = document.getElementById('debugDisp')
const debugSpec = document.getElementById('debugSpec')

let rebuildTimer = null

function rebuild() {
  const { url: mapUrl, maxMag } = renderDisplacementMap()
  const specUrl = renderSpecularMap()
  const scalePx = maxMag * params.strength

  rebuildFilter(mapUrl, specUrl, scalePx)

  glass.style.width = `${params.width}px`
  glass.style.height = `${params.height}px`
  glass.style.borderRadius = `${params.radius}px`
  glass.style.setProperty('--tint-alpha', params.tintAlpha)
  glass.style.setProperty('--map-url', `url(${mapUrl})`)
  glass.style.backdropFilter = `url(#lg3)`
  glass.style.webkitBackdropFilter = `url(#lg3)`
  glass.classList.toggle('show-map', params.showMap)

  debugMaps.hidden = !(params.showMap || params.showSpec)
  debugDisp.src = mapUrl
  debugSpec.src = specUrl
}

function scheduleRebuild() {
  clearTimeout(rebuildTimer)
  rebuildTimer = setTimeout(rebuild, 60)
}

// ============ Tweakpane 控制面板 ============
const pane = new Pane({ title: 'Liquid Glass v3', expanded: true })

const fSize = pane.addFolder({ title: '尺寸' })
fSize.addBinding(params, 'width', { min: 120, max: 720, step: 2 })
fSize.addBinding(params, 'height', { min: 60, max: 480, step: 2 })
fSize.addBinding(params, 'radius', { min: 4, max: 200, step: 1 })

const fOptics = pane.addFolder({ title: '光学(折射)' })
fOptics.addBinding(params, 'profile', {
  options: {
    '凸·超椭圆(Apple)': 'convex-squircle',
    '凸·圆面': 'convex-circle',
    '凹面': 'concave',
    '唇边': 'lip',
  },
})
fOptics.addBinding(params, 'bezelWidth', { min: 4, max: 100, step: 1 })
fOptics.addBinding(params, 'refractiveIndex', { min: 1.05, max: 2.4, step: 0.01 })
fOptics.addBinding(params, 'thickness', { min: 4, max: 100, step: 1 })
fOptics.addBinding(params, 'strength', { min: 0, max: 3, step: 0.05 })
fOptics.addBinding(params, 'invert')
fOptics.addBinding(params, 'chromaticAberration', { min: 0, max: 30, step: 0.5 })

const fFinish = pane.addFolder({ title: '质感' })
fFinish.addBinding(params, 'frost', { min: 0, max: 20, step: 0.5 })
fFinish.addBinding(params, 'saturation', { min: 0, max: 3, step: 0.05 })
fFinish.addBinding(params, 'tintAlpha', { min: 0, max: 0.6, step: 0.01 })

const fSpec = pane.addFolder({ title: '高光' })
fSpec.addBinding(params, 'specStrength', { min: 0, max: 2, step: 0.05 })
fSpec.addBinding(params, 'specWidth', { min: 0.05, max: 1, step: 0.05 })
fSpec.addBinding(params, 'lightAngle', { min: -180, max: 180, step: 5 })
fSpec.addBinding(params, 'dualRim')

const fDebug = pane.addFolder({ title: '调试', expanded: false })
fDebug.addBinding(params, 'showMap')
fDebug.addBinding(params, 'showSpec')

// 预设
const PRESETS = {
  '卡片': { width: 360, height: 220, radius: 40, bezelWidth: 32, thickness: 28, strength: 1, chromaticAberration: 6, frost: 2 },
  'Dock': { width: 420, height: 96, radius: 48, bezelWidth: 24, thickness: 22, strength: 1, chromaticAberration: 4, frost: 1 },
  '胶囊按钮': { width: 200, height: 64, radius: 32, bezelWidth: 18, thickness: 16, strength: 1.1, chromaticAberration: 3, frost: 0.5 },
  '厚玻璃(菜单)': { width: 300, height: 340, radius: 36, bezelWidth: 44, thickness: 46, strength: 1.2, chromaticAberration: 9, frost: 4 },
}
const fPresets = pane.addFolder({ title: '预设' })
for (const [name, preset] of Object.entries(PRESETS)) {
  fPresets.addButton({ title: name }).on('click', () => {
    Object.assign(params, preset)
    pane.refresh()
    scheduleRebuild()
  })
}

pane.on('change', scheduleRebuild)

// ============ 拖动 ============
let drag = null
glass.addEventListener('pointerdown', (e) => {
  drag = { dx: e.clientX - glass.offsetLeft, dy: e.clientY - glass.offsetTop }
  glass.setPointerCapture(e.pointerId)
})
glass.addEventListener('pointermove', (e) => {
  if (!drag) return
  glass.style.left = `${e.clientX - drag.dx}px`
  glass.style.top = `${e.clientY - drag.dy}px`
})
glass.addEventListener('pointerup', () => { drag = null })

// ============ 浏览器检测 ============
// 只有 Chromium 支持 backdrop-filter: url(#filter)
const isChromium = !!window.chrome
document.getElementById('browserWarn').hidden = isChromium

// 初始渲染
glass.style.left = `${(innerWidth - params.width) / 2}px`
glass.style.top = `${innerHeight * 0.52}px`
rebuild()
