<template>
  <div class="tester-container">
    <!-- 背景区域 -->
    <div 
      class="background-wrapper" 
      :style="{ filter: `blur(${controls.blurAmount}px)` }"
    >
      <div ref="canvasContainer" class="canvas-container"></div>
    </div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <h3>背景着色器测试面板</h3>
      
      <div class="control-group">
        <label>
          降采样比例 (Downscale): {{ controls.downscale }}x
          <span class="desc">越大越模糊但性能越好，1代表原分辨率</span>
        </label>
        <input type="range" min="1" max="16" step="1" v-model.number="controls.downscale" @input="updateResolution">
      </div>

      <div class="control-group">
        <label>CSS模糊滤镜 (Blur): {{ controls.blurAmount }}px</label>
        <input type="range" min="0" max="100" step="1" v-model.number="controls.blurAmount">
      </div>

      <div class="control-group">
        <label>
          <input type="checkbox" v-model="controls.useGrain" @change="updateShaderDefines">
          开启噪点 (Grain)
        </label>
      </div>
      
      <div class="control-group" v-if="controls.useGrain">
        <label>噪点强度: {{ controls.grainIntensity.toFixed(3) }}</label>
        <input type="range" min="0.01" max="0.2" step="0.01" v-model.number="controls.grainIntensity" @input="updateUniforms">
      </div>

      <div class="control-group">
        <label>
          <input type="checkbox" v-model="controls.useTwoNoiseLayers" @change="updateShaderDefines">
          开启双层Noise (性能消耗高)
        </label>
        <span class="desc" style="font-size: 11px; color: #aaa;">如果关闭，将复用第一层的反向值，视觉差异小但节省大量性能</span>
      </div>

      <div class="control-group">
        <label>Noise 缩放 (Scale): {{ controls.noiseScale.toFixed(2) }}</label>
        <input type="range" min="0.1" max="5.0" step="0.1" v-model.number="controls.noiseScale" @input="updateUniforms">
      </div>

      <div class="control-group">
        <label>Noise 速度 (Speed): {{ controls.noiseSpeed.toFixed(2) }}</label>
        <input type="range" min="0.0" max="1.0" step="0.05" v-model.number="controls.noiseSpeed" @input="updateUniforms">
      </div>
      
      <div class="control-group">
        <label>融合阈值 (Mix Threshold): {{ controls.mixThreshold.toFixed(2) }}</label>
        <input type="range" min="0.0" max="1.0" step="0.05" v-model.number="controls.mixThreshold" @input="updateUniforms">
      </div>
      
      <div class="control-group">
        <label>融合平滑度 (Mix Smooth): {{ controls.mixSmooth.toFixed(2) }}</label>
        <input type="range" min="0.0" max="1.0" step="0.01" v-model.number="controls.mixSmooth" @input="updateUniforms">
      </div>

      <div class="stats" v-if="renderStats">
        <p>当前渲染分辨率: {{ renderStats.width }} x {{ renderStats.height }}</p>
        <p>每一帧运算像素数: {{ (renderStats.width * renderStats.height).toLocaleString() }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three';
import { markRaw } from 'vue';

export default {
  name: 'DynamicBackgroundTester',
  data() {
    return {
      controls: {
        downscale: 4,
        blurAmount: 60,
        useGrain: false,
        grainIntensity: 0.04,
        useTwoNoiseLayers: false,
        noiseScale: 1.41,
        noiseSpeed: 0.2,
        mixThreshold: 0.2,
        mixSmooth: 0.096,
      },
      renderStats: {
        width: 0,
        height: 0
      },
      
      scene: null,
      camera: null,
      renderer: null,
      material: null,
      clock: null,
      animationId: null,
      
      uniforms: {
        uTime: { value: 0 },
        // 测试色板（比较鲜艳渐变的色系）
        uColor1: { value: new THREE.Color(0xff5e62) },
        uColor2: { value: new THREE.Color(0xff9966) },
        uColor3: { value: new THREE.Color(0x36D1DC) },
        uColor4: { value: new THREE.Color(0x5B86E5) },
        
        uAnchor1: { value: new THREE.Vector2(0.724, 0.724) },
        uAnchor2: { value: new THREE.Vector2(1.0, 0.429) },
        uAnchor3: { value: new THREE.Vector2(0.085, 0.0) },
        uAnchor4: { value: new THREE.Vector2(0.122, 0.0) },
        uNoiseParams: { value: new THREE.Vector2(1.41, 0.2) }, 
        uMixParams: { value: new THREE.Vector2(0.2, 0.096) },
        uGrainIntensity: { value: 0.04 }
      }
    };
  },
  mounted() {
    this.$nextTick(() => {
      this.initThreeJS();
      this.animate();
      window.addEventListener('resize', this.onWindowResize);
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onWindowResize);
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer) this.renderer.dispose();
  },
  methods: {
    initThreeJS() {
      this.scene = markRaw(new THREE.Scene());
      this.camera = markRaw(new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
      // 不开启抗锯齿，因为本来就会模糊
      this.renderer = markRaw(new THREE.WebGLRenderer({ antialias: false, alpha: true }));
      
      this.$refs.canvasContainer.appendChild(this.renderer.domElement);
      
      this.createMaterial();
      
      const geometry = markRaw(new THREE.PlaneGeometry(2, 2));
      const plane = markRaw(new THREE.Mesh(geometry, this.material));
      this.scene.add(plane);
      
      this.clock = markRaw(new THREE.Clock());
      
      this.updateResolution();
      this.updateUniforms();
    },
    
    createMaterial() {
      if (this.material) {
        this.scene.children[0].material.dispose();
      }
      
      // 使用 #define 控制特性编译
      const defines = {};
      if (this.controls.useGrain) defines.USE_GRAIN = '';
      if (this.controls.useTwoNoiseLayers) defines.USE_TWO_NOISE_LAYERS = '';

      this.material = markRaw(new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        defines: defines,
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
          
          uniform vec2 uNoiseParams; 
          uniform vec2 uMixParams;
          uniform float uGrainIntensity;
          
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
            float time = uTime * uNoiseParams.y;
            
            // Primary Noise
            float noiseVal = snoise(uv * uNoiseParams.x + time);
            vec2 distortedUV_13 = uv + vec2(noiseVal * 0.05);

            #ifdef USE_TWO_NOISE_LAYERS
              // Secondary Noise (耗时双倍)
              float noiseVal2 = snoise(uv * uNoiseParams.x + time + 100.0);
            #else
              // 复用 primary noise 反转，性能极佳
              float noiseVal2 = -noiseVal; 
            #endif

            vec2 distortedUV_24 = uv + vec2(noiseVal2 * 0.05);

            float d1 = distance(distortedUV_13, uAnchor1);
            float d3 = distance(distortedUV_13, uAnchor3);
            float d2 = distance(distortedUV_24, uAnchor2);
            float d4 = distance(distortedUV_24, uAnchor4);

            float p = 2.0; 
            float w1 = 1.0 / pow(d1 + 0.01, p);
            float w2 = 1.0 / pow(d2 + 0.01, p);
            float w3 = 1.0 / pow(d3 + 0.01, p);
            float w4 = 1.0 / pow(d4 + 0.01, p);
            
            float wSum = w1 + w2 + w3 + w4;
            w1 /= wSum; w2 /= wSum; w3 /= wSum; w4 /= wSum;

            vec3 colorLeft = (uColor2 * w2 + uColor4 * w4) / (w2 + w4 + 0.00001);
            vec3 colorRight = (uColor1 * w1 + uColor3 * w3) / (w1 + w3 + 0.00001);
            
            float splitField = (d2 + d4) - (d1 + d3); 
            float mixThreshold = uMixParams.x;
            float mixSmooth = uMixParams.y;
            
            float splitNoise = (noiseVal + noiseVal2) * 0.5;
            float splitMix = smoothstep(mixThreshold - mixSmooth, mixThreshold + mixSmooth, splitField + splitNoise * 0.1);
            
            vec3 color = mix(colorLeft, colorRight, splitMix);
            
            #ifdef USE_GRAIN
              float grain = fract(sin(dot(uv.xy, vec2(12.9898,78.233))) * 43758.5453);
              color += (grain - 0.5) * uGrainIntensity;
            #endif

            gl_FragColor = vec4(color, 1.0);
          }
        `
      }));
      
      if (this.scene && this.scene.children.length > 0) {
        this.scene.children[0].material = this.material;
      }
    },
    
    updateResolution() {
      if (!this.renderer) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      const rw = Math.floor(w / this.controls.downscale);
      const rh = Math.floor(h / this.controls.downscale);
      // 第三个参数 false 代表维持 CSS 尺寸不变，仅缩减画布物理尺寸
      this.renderer.setSize(rw, rh, false);
      
      this.renderStats.width = rw;
      this.renderStats.height = rh;
    },
    
    updateUniforms() {
      if (!this.uniforms) return;
      this.uniforms.uNoiseParams.value.x = this.controls.noiseScale;
      this.uniforms.uNoiseParams.value.y = this.controls.noiseSpeed;
      this.uniforms.uMixParams.value.x = this.controls.mixThreshold;
      this.uniforms.uMixParams.value.y = this.controls.mixSmooth;
      this.uniforms.uGrainIntensity.value = this.controls.grainIntensity;
    },
    
    updateShaderDefines() {
      this.createMaterial();
    },
    
    onWindowResize() {
      this.updateResolution();
    },
    
    animate() {
      this.animationId = requestAnimationFrame(this.animate);
      if (this.clock) {
        this.uniforms.uTime.value = this.clock.getElapsedTime();
      }
      this.renderer.render(this.scene, this.camera);
    }
  }
};
</script>

<style scoped>
.tester-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: #000;
  overflow: hidden;
}

.background-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* Transform hack 优化模糊性能，并且放大一点修复边缘白边 */
  transform: scale(1.1); 
  transform-origin: center center;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.canvas-container :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 300px;
  background: rgba(20, 20, 20, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  color: white;
  font-family: sans-serif;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  max-height: 90vh;
  overflow-y: auto;
}

.control-panel h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
  padding-bottom: 10px;
}

.control-group {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
}

.control-group label {
  font-size: 13px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group .desc {
  display: block;
  font-size: 11px;
  color: #aaa;
  margin-top: 4px;
}

input[type=range] {
  width: 100%;
  cursor: pointer;
}

input[type=checkbox] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.stats {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(255,255,255,0.2);
  font-size: 12px;
  color: #888;
}
.stats p {
  margin: 4px 0;
}
</style>
