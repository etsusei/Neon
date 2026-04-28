<template>
  <div class="dynamic-background" ref="container" :style="{ opacity: visible ? 1 : 0 }"></div>
</template>

<script>
import * as THREE from 'three';
import { markRaw } from 'vue';
import { mapState } from 'vuex';

export default {
  name: 'DynamicBackground',
  props: {
    // 控制背景是否可见（用于播放/暂停时的渐变切换）
    visible: {
      type: Boolean,
      default: false
    },
    // 专辑封面图片URL，用于提取颜色
    coverImage: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      downscale: 16, // 降采样比例，用于大幅提升渲染性能
      fpsInterval: 1000 / 30, // 限制最大帧率为 30fps
      lastRenderTime: 0,
      scene: null,
      camera: null,
      renderer: null,
      material: null,
      clock: null,
      animationId: null,
      
      // Shader uniforms
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0xffffff) },
        uColor2: { value: new THREE.Color(0xffffff) },
        uColor3: { value: new THREE.Color(0xffffff) },
        uColor4: { value: new THREE.Color(0xffffff) },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uAnchor1: { value: new THREE.Vector2(0.724, 0.724) },
        uAnchor2: { value: new THREE.Vector2(1.0, 0.429) },
        uAnchor3: { value: new THREE.Vector2(0.085, 0.0) },
        uAnchor4: { value: new THREE.Vector2(0.122, 0.0) },
        uNoiseParams: { value: new THREE.Vector2(1.41, 0.2) }, // Scale, Speed (preset)
        uMixParams: { value: new THREE.Vector2(0.2, 0.1) }, // Threshold, Smooth (preset) - threshold will be modulated by audio
        uAudioIntensity: { value: 0.0 } // Audio intensity for saturation modulation
      },
      
      // 目标颜色（用于平滑过渡）
      targetColors: {
        color1: new THREE.Color(0xffffff),
        color2: new THREE.Color(0xffffff),
        color3: new THREE.Color(0xffffff),
        color4: new THREE.Color(0xffffff)
      },
      
      // 颜色过渡速度
      colorTransitionSpeed: 0.05,
      
      // 渲染控制
      isPaused: false
    };
  },
  computed: {
    ...mapState(['audioIntensity'])
  },
  watch: {
    visible(newVal) {
      console.log('[DynamicBackground] visible changed:', newVal);
    },
    audioIntensity(newIntensity) {
      // Update mixThreshold based on audio intensity
      if (this.uniforms && this.uniforms.uMixParams) {
        const baseMixThreshold = 0.2;
        const maxMixThreshold = 0.22; // Subtle range for clean visual
        const modulatedThreshold = baseMixThreshold + newIntensity * (maxMixThreshold - baseMixThreshold);
        this.uniforms.uMixParams.value.x = modulatedThreshold;
      }
    },
    coverImage(newCover, oldCover) {
      console.log('[DynamicBackground] ===== coverImage prop changed =====');
      console.log('[DynamicBackground] Old:', oldCover);
      console.log('[DynamicBackground] New:', newCover);
      console.log('[DynamicBackground] Are they different?', newCover !== oldCover);
      console.log('[DynamicBackground] visible:', this.visible);
      
      // Extract colors whenever cover changes, regardless of visibility
      // This ensures colors are ready when transitioning from paused to playing
      // and when switching tracks during playback
      if (newCover && newCover !== oldCover) {
        console.log('[DynamicBackground] ✓ Conditions met, extracting colors...');
        this.extractAndApplyColors(newCover);
      } else {
        console.log('[DynamicBackground] ✗ Conditions not met, skipping color extraction');
        console.log('[DynamicBackground]   newCover exists?', !!newCover);
        console.log('[DynamicBackground]   covers different?', newCover !== oldCover);
      }
    }
  },
  mounted() {
    console.log('[DynamicBackground] Component mounted');
    console.log('[DynamicBackground] Initial props - visible:', this.visible, 'coverImage:', this.coverImage);
    // 使用 nextTick 确保 DOM 已经渲染
    this.$nextTick(() => {
      if (this.$refs.container) {
        console.log('[DynamicBackground] Container ref found, initializing Three.js');
        this.initThreeJS();
        this.animate();
        window.addEventListener('resize', this.onWindowResize);
      } else {
        console.error('[DynamicBackground] container ref not found');
      }
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onWindowResize);
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  },
  methods: {
    initThreeJS() {
      // Scene Setup - use markRaw to prevent Vue proxy issues with Three.js
      this.scene = markRaw(new THREE.Scene());
      this.camera = markRaw(new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
      // 关闭抗锯齿并应用降采样
      this.renderer = markRaw(new THREE.WebGLRenderer({ antialias: false, alpha: true }));
      
      const rw = Math.floor(window.innerWidth / this.downscale);
      const rh = Math.floor(window.innerHeight / this.downscale);
      this.renderer.setSize(rw, rh, false);
      
      // 强制设置 canvas 样式撑满容器
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';
      
      this.$refs.container.appendChild(this.renderer.domElement);
      
      // Shader Material
      this.material = markRaw(new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          uniform vec3 uColor4;
          
          uniform vec2 uAnchor1;
          uniform vec2 uAnchor2;
          uniform vec2 uAnchor3;
          uniform vec2 uAnchor4;
          
          uniform vec2 uResolution;
          uniform vec2 uNoiseParams; 
          uniform vec2 uMixParams;
          uniform float uAudioIntensity; // Audio intensity for threshold modulation (not directly used in shader, but kept for clarity)
          varying vec2 vUv;

          // Simplex 2D noise
          vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

          float snoise(vec2 v){
            const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                    -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
            + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }

          void main() {
            vec2 uv = vUv;
            
            // Noise for organic movement
            float time = uTime * uNoiseParams.y;
            
            // Primary Noise (for 1 & 3)
            float noiseVal = snoise(uv * uNoiseParams.x + time);
            vec2 distortedUV_13 = uv + vec2(noiseVal * 0.05);

            // Secondary Noise (for 2 & 4) - Offset time/phase for independence
            float noiseVal2 = snoise(uv * uNoiseParams.x + time + 100.0);
            vec2 distortedUV_24 = uv + vec2(noiseVal2 * 0.05);

            // Calculate distances to all 4 anchors
            // 1 & 3 use primary distortion
            float d1 = distance(distortedUV_13, uAnchor1);
            float d3 = distance(distortedUV_13, uAnchor3);
            
            // 2 & 4 use secondary distortion
            float d2 = distance(distortedUV_24, uAnchor2);
            float d4 = distance(distortedUV_24, uAnchor4);

            // Inverse Distance Weighting (IDW)
            float p = 2.0; 
            
            float w1 = 1.0 / pow(d1 + 0.01, p);
            float w2 = 1.0 / pow(d2 + 0.01, p);
            float w3 = 1.0 / pow(d3 + 0.01, p);
            float w4 = 1.0 / pow(d4 + 0.01, p);
            
            float wSum = w1 + w2 + w3 + w4;
            
            w1 /= wSum;
            w2 /= wSum;
            w3 /= wSum;
            w4 /= wSum;

            // Group Colors: Left (2+4) vs Right (1+3)
            vec3 colorLeft = (uColor2 * w2 + uColor4 * w4) / (w2 + w4 + 0.00001);
            vec3 colorRight = (uColor1 * w1 + uColor3 * w3) / (w1 + w3 + 0.00001);
            
            // Calculate Split Field
            float splitField = (d2 + d4) - (d1 + d3); 
            
            float mixThreshold = uMixParams.x;
            float mixSmooth = uMixParams.y;
            
            // Calculate Mix Factor
            float splitNoise = (noiseVal + noiseVal2) * 0.5;
            float splitMix = smoothstep(mixThreshold - mixSmooth, mixThreshold + mixSmooth, splitField + splitNoise * 0.1);
            
            // Final Blend
            vec3 color = mix(colorLeft, colorRight, splitMix);

            gl_FragColor = vec4(color, 1.0);
          }
        `
      }));
      
      // Plane
      const geometry = markRaw(new THREE.PlaneGeometry(2, 2));
      const plane = markRaw(new THREE.Mesh(geometry, this.material));
      this.scene.add(plane);
      
      // Clock
      this.clock = markRaw(new THREE.Clock());
    },
    
    animate() {
      if (this.isPaused) return;
      
      // 把 requestAnimationFrame 放在前面，确保循环持续运行
      this.animationId = requestAnimationFrame(this.animate);
      
      const now = Date.now();
      const elapsed = now - (this.lastRenderTime || 0);
      
      // 如果还没达到设定的帧间隔时间，直接跳过渲染
      if (elapsed < this.fpsInterval) return;
      
      // 记录这次渲染的时间，减去余数避免细微误差累积
      this.lastRenderTime = now - (elapsed % this.fpsInterval);
      
      // Update time uniform (Three.js Clock 自动处理真实时间)
      this.uniforms.uTime.value = this.clock.getElapsedTime();
      
      // Smoothly transition colors
      this.updateColorTransition();
      
      // Render scene
      this.renderer.render(this.scene, this.camera);
    },
    
    updateColorTransition() {
      // 平滑过渡到目标颜色
      this.uniforms.uColor1.value.lerp(this.targetColors.color1, this.colorTransitionSpeed);
      this.uniforms.uColor2.value.lerp(this.targetColors.color2, this.colorTransitionSpeed);
      this.uniforms.uColor3.value.lerp(this.targetColors.color3, this.colorTransitionSpeed);
      this.uniforms.uColor4.value.lerp(this.targetColors.color4, this.colorTransitionSpeed);
    },
    
    extractAndApplyColors(imageUrl) {
      console.log('[DynamicBackground] extractAndApplyColors called with:', imageUrl);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('[DynamicBackground] Image loaded successfully');
        const colors = this.extractColors(img);
        console.log('[DynamicBackground] Extracted colors:', colors.map(c => ({ 
          r: c.r.toFixed(3), 
          g: c.g.toFixed(3), 
          b: c.b.toFixed(3),
          hex: '#' + c.getHexString()
        })));
        // 设置目标颜色，让过渡动画自动完成
        this.targetColors.color1 = colors[0];
        this.targetColors.color2 = colors[1];
        this.targetColors.color3 = colors[2];
        this.targetColors.color4 = colors[3];
        console.log('[DynamicBackground] Target colors updated');
        
        // 计算 uColor1 和 uColor4 的亮度来决定歌词颜色
        // 使用相对亮度公式: L = 0.299*R + 0.587*G + 0.114*B
        const luminance1 = 0.299 * colors[0].r + 0.587 * colors[0].g + 0.114 * colors[0].b;
        const luminance4 = 0.299 * colors[3].r + 0.587 * colors[3].g + 0.114 * colors[3].b;
        
        // 取两个颜色中较暗的亮度作为判断标准
        const minLuminance = Math.min(luminance1, luminance4);
        
        // 如果亮度低于 0.4（较暗），则启用深色模式（白色歌词）
        const isDarkBackground = minLuminance < 0.4;
        console.log('[DynamicBackground] Luminance - color1:', luminance1.toFixed(3), 
                    'color4:', luminance4.toFixed(3), 
                    'min:', minLuminance.toFixed(3), 
                    'isDark:', isDarkBackground);
        
        this.$store.commit('SetLyricDarkMode', isDarkBackground);
      };
      img.onerror = (error) => {
        console.error('[DynamicBackground] Failed to load cover image:', error);
      };
      img.src = imageUrl;
    },
    
    extractColors(image) {
      console.log('[DynamicBackground] extractColors called, image:', image.width, 'x', image.height);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Resize for performance
      canvas.width = 64;
      canvas.height = 64;
      ctx.drawImage(image, 0, 0, 64, 64);

      const imageData = ctx.getImageData(0, 0, 64, 64).data;
      const colorCounts = {};
      const quantization = 32; // Group similar colors

      for (let i = 0; i < imageData.length; i += 4) {
        const r = Math.floor(imageData[i] / quantization) * quantization;
        const g = Math.floor(imageData[i + 1] / quantization) * quantization;
        const b = Math.floor(imageData[i + 2] / quantization) * quantization;

        // Ignore very dark or very light pixels
        if ((r + g + b) < 50 || (r + g + b) > 700) continue;

        const key = `${r},${g},${b}`;
        colorCounts[key] = (colorCounts[key] || 0) + 1;
      }

      console.log('[DynamicBackground] Color counts:', Object.entries(colorCounts).length, 'unique colors found');

      // Sort by frequency
      const sortedColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);

      // Pick top 4 distinct colors
      const palette = [];

      for (let [key] of sortedColors) {
        if (palette.length >= 4) break;

        const [r, g, b] = key.split(',').map(Number);
        const color = new THREE.Color(`rgb(${r}, ${g}, ${b})`);

        // Check if this color is too similar to existing ones
        let isDistinct = true;
        for (let existing of palette) {
          const dr = existing.r - color.r;
          const dg = existing.g - color.g;
          const db = existing.b - color.b;
          if (Math.sqrt(dr * dr + dg * dg + db * db) < 0.2) {
            isDistinct = false;
            break;
          }
        }

        if (isDistinct) {
          palette.push(color);
        }
      }

      console.log('[DynamicBackground] Palette before fill:', palette.length, 'colors');

      // Fill remaining slots
      while (palette.length < 4) {
        if (palette.length > 0) {
          palette.push(palette[0].clone().offsetHSL(0.1, 0, 0));
        } else {
          palette.push(new THREE.Color(0x333333));
        }
      }

      console.log('[DynamicBackground] Final palette:', palette.map(c => '#' + c.getHexString()));
      return palette;
    },
    
    onWindowResize() {
      const rw = Math.floor(window.innerWidth / this.downscale);
      const rh = Math.floor(window.innerHeight / this.downscale);
      this.renderer.setSize(rw, rh, false);
      this.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      
      // 即使在暂停状态下，也要渲染一帧以更新画面，避免黑屏
      if (this.isPaused && this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    },
    
    pauseRendering() {
      console.log('[DynamicBackground] Rendering paused');
      this.isPaused = true;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    },
    
    resumeRendering() {
      if (!this.isPaused) return;
      console.log('[DynamicBackground] Rendering resumed');
      this.isPaused = false;
      // 重置时钟，避免时间跳跃
      if (this.clock) {
        this.clock.start();
      }
      this.animate();
    }
  }
};
</script>

<style scoped>
.dynamic-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0; /* Lowered to sit behind content */
  pointer-events: none;
  transition: opacity 0.8s ease-in-out;
  transform: scale(1.1); /* 防止降采样造成的边缘白边 */
  transform-origin: center center;
}

.dynamic-background :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
