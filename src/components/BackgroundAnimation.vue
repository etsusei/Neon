<template>
  <canvas ref="canvas" id="canvas" :class="{ 'no-blur': noBlur }"></canvas>
</template>

<script>
export default {
  name: 'BackgroundAnimation',
  props: {
    noBlur: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      canvas: {
        width: 0,
        height: 0,
      },
      gl: null,
      time: 0.0,
      vertexSource: null,
      fragmentSource: null,
      vertexShader: null,
      fragmentShader: null,
      vertexData: null,
      vertexDataBuffer: null,
      positionHandle: null,
      shaderSource: null,
      shaderType: null,
      program: null,
      timeHandle: null,
      widthHandle: null,
      heightHandle: null,
      lastFrame: null,
      thisFrame: null,
      isPaused: false,
    };
  },
  methods: {
    ShaderSources() {
      this.vertexSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
      `;
      this.fragmentSource = `
      precision highp float;

      #define AA

      uniform float width;
      uniform float height;
      vec2 resolution = vec2(width, height);

      uniform float time;

      void main(){

        float strength = 0.4;
        float t = time/6.0;

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

            for(float k = 1.0; k < 7.0; k+=1.0){ 
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
    onWindowResize() {
      const canvasEl = this.$refs.canvas;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      canvasEl.width = this.canvas.width;
      canvasEl.height = this.canvas.height;
      
      if (this.gl) {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.widthHandle, window.innerWidth);
        this.gl.uniform1f(this.heightHandle, window.innerHeight);
        
        // 即使在暂停状态下，也要渲染一帧以更新画面，避免黑屏
        if (this.isPaused) {
          this.gl.uniform1f(this.timeHandle, this.time);
          this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        }
      }
    },
    compileShader(shaderSource, shaderType) {
      var shader = this.gl.createShader(shaderType);
      this.gl.shaderSource(shader, shaderSource);
      this.gl.compileShader(shader);
      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        throw "Shader compile failed with: " + this.gl.getShaderInfoLog(shader);
      }
      return shader;
    },
    getAttribLocation(program, name) {
      var attributeLocation = this.gl.getAttribLocation(program, name);
      if (attributeLocation === -1) {
        throw "Cannot find attribute " + name + ".";
      }
      return attributeLocation;
    },
    getUniformLocation(program, name) {
      var attributeLocation = this.gl.getUniformLocation(program, name);
      if (attributeLocation === -1) {
        throw "Cannot find uniform " + name + ".";
      }
      return attributeLocation;
    },
    draw() {
      // 如果暂停，停止渲染
      if (this.isPaused) {
        return;
      }
      
      //Update time
      this.thisFrame = Date.now();
      this.time += (this.thisFrame - this.lastFrame) / 5000;
      this.lastFrame = this.thisFrame;

      //Send uniforms to program
      this.gl.uniform1f(this.timeHandle, this.time);

      //Draw a triangle strip connecting vertices 0-4
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(this.draw);
    },
    pauseRendering() {
      console.log('[BackgroundAnimation] Rendering paused');
      this.isPaused = true;
    },
    resumeRendering() {
      if (!this.isPaused) return;
      console.log('[BackgroundAnimation] Rendering resumed');
      this.isPaused = false;
      this.lastFrame = Date.now(); // 重置时间，避免时间跳跃
      this.draw();
    },
  },
  mounted() {
    this.ShaderSources();
    const canvasEl = this.$refs.canvas;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    canvasEl.width = this.canvas.width;
    canvasEl.height = this.canvas.height;

    // Initialize the GL context
    this.gl = canvasEl.getContext("webgl");
    if (!this.gl) {
      console.error("Unable to initialize WebGL.");
      return;
    }

    //Create shader programs
    this.program = this.gl.createProgram();

    //Utility functions
    window.addEventListener("resize", this.onWindowResize, false);

    //Create vertex and fragment shaders
    this.vertexShader = this.compileShader(
      this.vertexSource,
      this.gl.VERTEX_SHADER
    );
    this.fragmentShader = this.compileShader(
      this.fragmentSource,
      this.gl.FRAGMENT_SHADER
    );

    //Create shader programs
    this.gl.attachShader(this.program, this.vertexShader);
    this.gl.attachShader(this.program, this.fragmentShader);
    this.gl.linkProgram(this.program);
    this.gl.useProgram(this.program);

    //Set up rectangle covering entire canvas
    this.vertexData = new Float32Array([
      -1.0, 1.0, // top left
      -1.0, -1.0, // bottom left
      1.0, 1.0, // top right
      1.0, -1.0, // bottom right
    ]);

    //Create vertex buffer
    this.vertexDataBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexDataBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.vertexData,
      this.gl.STATIC_DRAW
    );

    // Layout of our data in the vertex buffer
    this.positionHandle = this.getAttribLocation(this.program, "position");
    this.gl.enableVertexAttribArray(this.positionHandle);
    this.gl.vertexAttribPointer(
      this.positionHandle,
      2, // position is a vec2 (2 values per component)
      this.gl.FLOAT, // each component is a float
      false, // don't normalize values
      2 * 4, // two 4 byte float components per vertex (32 bit float is 4 bytes)
      0 // how many bytes inside the buffer to start from
    );

    //Set uniform handle
    this.timeHandle = this.getUniformLocation(this.program, "time");
    this.widthHandle = this.getUniformLocation(this.program, "width");
    this.heightHandle = this.getUniformLocation(this.program, "height");

    this.gl.uniform1f(this.widthHandle, window.innerWidth);
    this.gl.uniform1f(this.heightHandle, window.innerHeight);

    this.lastFrame = Date.now();

    this.draw();
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.onWindowResize);
  }
};
</script>

<style scoped>
#canvas {
  -webkit-filter: blur(30px);
  filter: blur(30px);
  z-index: -2;
  position: absolute;
  left: 0px;
  top: 0px;
  width: 100%;
  height: 100%;
}
#canvas.no-blur {
  -webkit-filter: none;
  filter: none;
}
</style>
