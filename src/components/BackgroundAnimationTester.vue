<template>
  <div class="tester-container">
    <!-- 背景区域，沿用了原版的扩大 110% 策略来隐藏边缘 -->
    <div class="background-wrapper" :style="{ filter: `blur(${controls.blur}px)` }">
      <canvas ref="canvas" id="canvas"></canvas>
    </div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <h3>待机动画测试面板</h3>
      
      <div class="control-group">
        <label>
          降采样比例 (Downscale): {{ controls.downscale }}x
        </label>
        <input type="range" min="1" max="16" step="1" v-model.number="controls.downscale" @input="onWindowResize">
      </div>

      <div class="control-group">
        <label>CSS模糊滤镜 (Blur): {{ controls.blur }}px</label>
        <input type="range" min="0" max="50" step="1" v-model.number="controls.blur">
      </div>

      <div class="control-group">
        <label>
          <input type="checkbox" v-model="controls.enableAA" @change="rebuildShader">
          开启 9x 超采样抗锯齿 (AA)
        </label>
        <span class="desc">极度消耗性能，关掉能瞬间提升 9 倍性能，加了模糊后肉眼几乎看不出区别</span>
      </div>

      <div class="control-group">
        <label>流动迭代次数 (Iterations): {{ controls.iterations }}</label>
        <input type="range" min="1" max="10" step="1" v-model.number="controls.iterations" @change="rebuildShader">
        <span class="desc">降低可大幅提升性能，原版是 6，建议测测 3~4 的效果</span>
      </div>

      <div class="control-group">
        <label>扭曲强度 (Strength): {{ controls.strength.toFixed(2) }}</label>
        <input type="range" min="0.1" max="1.0" step="0.05" v-model.number="controls.strength" @input="updateUniforms">
      </div>
      
      <div class="control-group">
        <label>流动速度除数 (Speed Divisor): {{ controls.speed.toFixed(1) }}</label>
        <input type="range" min="1.0" max="20.0" step="0.5" v-model.number="controls.speed" @input="updateUniforms">
        <span class="desc">越小越快，原版是 6.0</span>
      </div>

      <div class="stats" v-if="renderStats">
        <p>当前渲染物理分辨率: {{ renderStats.width }} x {{ renderStats.height }}</p>
        <p>每一帧基础像素数: {{ (renderStats.width * renderStats.height).toLocaleString() }}</p>
        <p>算上AA和迭代的实际运算量: <br><strong style="color: #ff5e62;">约 {{ (renderStats.width * renderStats.height * (controls.enableAA ? 9 : 1) * controls.iterations).toLocaleString() }} 次循环/帧</strong></p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BackgroundAnimationTester',
  data() {
    return {
      controls: {
        downscale: 1, // 初始保持原版 1x
        blur: 15,     // 初始保持原版 15px
        enableAA: true, // 初始保持原版开启
        iterations: 6,  // 初始保持原版 6 次
        strength: 0.4,
        speed: 6.0,
      },
      renderStats: { width: 0, height: 0 },
      canvas: { width: 0, height: 0 },
      gl: null,
      time: 0.0,
      vertexSource: null,
      fragmentSource: null,
      program: null,
      timeHandle: null,
      widthHandle: null,
      heightHandle: null,
      strengthHandle: null,
      speedHandle: null,
      lastFrame: null,
      thisFrame: null,
      animationId: null
    };
  },
  methods: {
    getVertexSource() {
      return `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
      `;
    },
    getFragmentSource() {
      let aaStr = this.controls.enableAA ? '#define AA' : '';
      let iter = this.controls.iterations.toFixed(1);
      
      return `
      precision highp float;
      ${aaStr}

      uniform float width;
      uniform float height;
      vec2 resolution = vec2(width, height);

      uniform float time;
      uniform float strength;
      uniform float speedDivisor;

      void main(){
        float t = time / speedDivisor;
        vec3 col = vec3(0);
        vec2 fC = gl_FragCoord.xy;

        #ifdef AA
        for(int i = -1; i <= 1; i++) {
          for(int j = -1; j <= 1; j++) {
            fC = gl_FragCoord.xy+vec2(i,j)/3.0;
        #endif

            //Normalized pixel coordinates (from 0 to 1)
            vec2 pos = fC/resolution.xy;
            pos.y /= resolution.x/resolution.y;
            pos = 4.0*(vec2(0.5) - pos);

            for(float k = 1.0; k < ${iter} + 0.1; k+=1.0){ 
              pos.x += strength * sin(2.0*t+k*1.5 * pos.y)+t*0.5;
              pos.y += strength * cos(2.0*t+k*1.5 * pos.x);
            }

            //Time varying pixel colour
            col += 0.5 + 0.5*cos(time+pos.xyx+vec3(0,2,4));

        #ifdef AA
          }
        }
        col /= 9.0;
        #endif

        //Gamma
        col = pow(col, vec3(0.2));

        //Fragment colour
        gl_FragColor = vec4(col,1.0);
      }
      `;
    },
    compileShader(shaderSource, shaderType) {
      var shader = this.gl.createShader(shaderType);
      this.gl.shaderSource(shader, shaderSource);
      this.gl.compileShader(shader);
      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        console.error("Shader compile failed with: " + this.gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    },
    getAttribLocation(program, name) {
      return this.gl.getAttribLocation(program, name);
    },
    getUniformLocation(program, name) {
      return this.gl.getUniformLocation(program, name);
    },
    rebuildShader() {
      if (!this.gl) return;
      
      const newProgram = this.gl.createProgram();
      const vs = this.compileShader(this.getVertexSource(), this.gl.VERTEX_SHADER);
      const fs = this.compileShader(this.getFragmentSource(), this.gl.FRAGMENT_SHADER);
      
      if(!vs || !fs) return;

      this.gl.attachShader(newProgram, vs);
      this.gl.attachShader(newProgram, fs);
      this.gl.linkProgram(newProgram);
      
      if (this.program) {
        this.gl.deleteProgram(this.program);
      }
      this.program = newProgram;
      this.gl.useProgram(this.program);

      // Buffer setup
      const vertexData = new Float32Array([
        -1.0, 1.0,
        -1.0, -1.0,
        1.0, 1.0,
        1.0, -1.0,
      ]);
      const vertexDataBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexDataBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, vertexData, this.gl.STATIC_DRAW);

      const positionHandle = this.getAttribLocation(this.program, "position");
      this.gl.enableVertexAttribArray(positionHandle);
      this.gl.vertexAttribPointer(positionHandle, 2, this.gl.FLOAT, false, 8, 0);

      // Uniforms
      this.timeHandle = this.getUniformLocation(this.program, "time");
      this.widthHandle = this.getUniformLocation(this.program, "width");
      this.heightHandle = this.getUniformLocation(this.program, "height");
      this.strengthHandle = this.getUniformLocation(this.program, "strength");
      this.speedHandle = this.getUniformLocation(this.program, "speedDivisor");

      this.onWindowResize();
      this.updateUniforms();
    },
    onWindowResize() {
      const canvasEl = this.$refs.canvas;
      if (!canvasEl) return;
      
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      this.canvas.width = Math.floor(w / this.controls.downscale);
      this.canvas.height = Math.floor(h / this.controls.downscale);
      
      canvasEl.width = this.canvas.width;
      canvasEl.height = this.canvas.height;
      
      // CSS size covers screen
      canvasEl.style.width = '100%';
      canvasEl.style.height = '100%';
      
      this.renderStats.width = this.canvas.width;
      this.renderStats.height = this.canvas.height;
      
      if (this.gl && this.program) {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.widthHandle, this.canvas.width);
        this.gl.uniform1f(this.heightHandle, this.canvas.height);
      }
    },
    updateUniforms() {
      if (this.gl && this.program) {
        if(this.strengthHandle) this.gl.uniform1f(this.strengthHandle, this.controls.strength);
        if(this.speedHandle) this.gl.uniform1f(this.speedHandle, this.controls.speed);
      }
    },
    draw() {
      this.thisFrame = Date.now();
      this.time += (this.thisFrame - this.lastFrame) / 5000;
      this.lastFrame = this.thisFrame;

      if(this.gl && this.program && this.timeHandle) {
        this.gl.uniform1f(this.timeHandle, this.time);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
      }
      this.animationId = requestAnimationFrame(this.draw);
    }
  },
  mounted() {
    const canvasEl = this.$refs.canvas;
    this.gl = canvasEl.getContext("webgl");
    if (!this.gl) {
      console.error("Unable to initialize WebGL.");
      return;
    }
    
    this.rebuildShader();
    this.lastFrame = Date.now();
    this.draw();
    window.addEventListener("resize", this.onWindowResize, false);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.onWindowResize);
    if(this.animationId) cancelAnimationFrame(this.animationId);
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
  top: -5%;
  left: -5%;
  width: 110%;
  height: 110%;
  transform-origin: center center;
}

#canvas {
  display: block;
}

.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 340px;
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
  accent-color: #1DB954;
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
