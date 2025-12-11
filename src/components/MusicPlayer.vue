<template>
  <div class="playerwarper">
    <div class="musicplayer">
      <liquid-card border-radius="32px 32px 0 0" custom-class="player-liquid-glass" :overflow-visible="true">
        <div class="musicplayer-content">
          <div class="musicplayer-left">
            <div class="album-info">
              <div 
                class="player-cover__item"
                @click="toggleImmersiveMode"
                :style="{ 
                  backgroundImage: `url(${currentTrack.cover})`,
                  transform: `scale(${albumScale})`,
                  transition: 'transform 0.1s ease-out'
                }"
              >
                <!-- 覆盖层 -->
                <div class="cover-overlay">
                  <i class="fa fa-eye"></i>
                </div>
              </div>
              <div class="album-right">
                <div class="album-right_name">{{ currentTrack.name }}</div>
                <div class="album-right_info">
                  {{ currentTrack.album }}-----{{ currentTrack.artist }}
                </div>
              </div>
            </div>
          </div>
          <div class="musicplayer-middle">
            <div class="player-controls">
              <div class="track-control">
                <div class="track-control_row">
                  <div class="track-control_icon">
                    <i class="fa fa-heart"></i>
                  </div>
                  <div class="track-control_icon" @click="prevTrack">
                    <i class="fa fa-backward"></i>
                  </div>
                  <div class="track-control_iconPlay" @click="play">
                    <i class="fa fa-pause-circle-o" v-if="isTimerPlaying"></i>
                    <i class="fa fa-play-circle-o" v-else></i>
                  </div>
                  <div class="track-control_icon" @click="nextTrack">
                    <i class="fa fa-forward"></i>
                  </div>
                  <div class="track-control_icon" @click="togglePlayMode" :title="playModeTitle">
                    <i class="fa fa-repeat" v-if="playMode === 'sequence'"></i>
                    <i class="fa fa-random" v-else-if="playMode === 'shuffle'"></i>
                    <i class="fa fa-repeat" style="color: #f6002e;" v-else></i>
                  </div>
                </div>
              </div>
              <div class="progress" ref="progress">
                <div class="progress_bar" @click="clickProgress">
                  <div class="progress_current" :style="{ width: barWidth }"></div>
                </div>
                <div class="time">
                  <div class="progress_time">{{ currentTime }}</div>
                  <div class="progress_duration">{{ duration }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="musicplayer-right" ref="right">
            <div class="volume-control">
              <div class="volume-control_row">
                <div class="volume-control_speaker">
                  <i class="fa fa-volume-up"></i>
                </div>
                <div class="volume-control_bar">
                  <div 
                    class="bar" 
                    ref="volume"
                    @mousedown="startVolumeDrag"
                    @click="clickVolume"
                  >
                    <div
                      class="current-volume"
                      :style="{ width: volumeWidth }"
                    ></div>
                  </div>
                </div>
                <div class="playlist-btn" @click="showPlaylist = true">
                  <i class="fa fa-list"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </liquid-card>
    </div>
    <playlist-popup :show="showPlaylist" @close="showPlaylist = false" />
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import { mapMutations } from "vuex";
import { getSongUrl } from "../api/neteaseApi";
import { ElMessage } from "element-plus";
import PlaylistPopup from "./PlaylistPopup.vue";
import LiquidCard from "./LiquidCard.vue";
export default {
  components: {
    PlaylistPopup,
    LiquidCard
  },
  data() {
    return {
      audio: null,
      circleLeft: null,
      barWidth: null,
      duration: null,
      currentTime: null,
      isTimerPlaying: false,
      currentTrack: null,
      currentTrackIndex: 0,
      transitionName: null,
      volumeLeft: null,
      volumeWidth: null,
      currentVolume: null,
      skipFailedCount: 0,
      audioContext: null,
      audioSource: null,
      analyser: null,
      // Audio visualization
      albumScale: 1.0,
      visualizationFrameId: null,
      // Envelope follower for smoother, transient-focused audio response
      envelopeValue: 0.0,
      peakValue: 0.0,
      peakDecayRate: 0.995, // Slow decay for peak tracking
      // Onset detection
      lastOnsetTime: 0, // Timestamp of last detected onset (for gate)
      gateTime: 250, // Gate time in ms - ignore onsets within this period
      smoothedIntensity: 0.0, // Smoothed output value for visualization
      decayRate: 0.92, // How fast the value decays after onset (0.9-0.95 recommended)
      showPlaylist: false, // 播放列表弹窗
      // iOS 后台播放支持
      isIOS: false,
      // Volume drag state
      isDraggingVolume: false
    };
  },
  computed: {
    ...mapGetters(["tracks", "index"]),
    seekTime() {
      return this.$store.state.seekTime;
    },
    playMode() {
      return this.$store.state.playMode;
    },
    isSinglePlay() {
      return this.$store.state.isSinglePlay;
    },
    shuffledIndices() {
      return this.$store.state.shuffledIndices;
    },
    playModeTitle() {
      const titles = {
        'sequence': '顺序循环',
        'shuffle': '随机播放',
        'repeat-one': '单曲循环'
      };
      return titles[this.playMode] || '顺序循环';
    }
  },
  watch: {
    tracks: {
      handler: function (newtrack, oldtrack) {
        // 当播放列表改变时，需要重新加载当前歌曲
        // 使用 JSON 比较来检测实际内容变化
        if (oldtrack && newtrack && JSON.stringify(newtrack) !== JSON.stringify(oldtrack)) {
          console.log('[MusicPlayer] Tracks changed, refreshing player');
          // 延迟执行以确保 index 也已更新
          this.$nextTick(() => {
            this.jumpToClick();
          });
        }
      },
      deep: true,
      immediate: false, // 不在初始化时触发
    },
    index: {
      handler: function (newindex) {
        if (newindex !== undefined && newindex !== null) {
          if (this.isTimerPlaying == true) {
            this.audio.pause();
            this.isTimerPlaying = false;
          }
          this.jumpToClick();
        }
      },
      deep: true,
      immediate: true,
    },
    seekTime(time) {
      if (time !== null && time !== undefined) {
        this.seekToTime(time);
        // 重置 seekTime
        this.$store.commit('SetSeekTime', null);
      }
    }
  },
  methods: {
    ...mapMutations({ pushIndex: "PushIndex" }),
    play() {
      if (this.audio.paused) {
        this.audio.play();
        this.isTimerPlaying = true;
        this.$store.commit('SetIsPlaying', true);
        this.startVisualization();
        if (this.audioContext && this.audioContext.state === "suspended") {
          this.audioContext.resume();
        }
      } else {
        this.audio.pause();
        this.isTimerPlaying = false;
        this.$store.commit('SetIsPlaying', false);
        this.stopVisualization();
      }
    },
    generateTime() {
      let width = (100 / this.audio.duration) * this.audio.currentTime;
      this.barWidth = width + "%";
      this.circleLeft = width + "%";
      let durmin = Math.floor(this.audio.duration / 60);
      let dursec = Math.floor(this.audio.duration - durmin * 60);
      let curmin = Math.floor(this.audio.currentTime / 60);
      let cursec = Math.floor(this.audio.currentTime - curmin * 60);
      if (durmin < 10) {
        durmin = "0" + durmin;
      }
      if (dursec < 10) {
        dursec = "0" + dursec;
      }
      if (curmin < 10) {
        curmin = "0" + curmin;
      }
      if (cursec < 10) {
        cursec = "0" + cursec;
      }
      this.duration = durmin + ":" + dursec;
      this.currentTime = curmin + ":" + cursec;
      // 同步时间到 store 用于歌词同步
      this.$store.commit('SetCurrentTime', this.audio.currentTime);
    },
    updateBar(x) {
      let progress = this.$refs.progress;
      let maxduration = this.audio.duration;
      let position = x - progress.offsetLeft;
      let percentage = (100 * position) / progress.offsetWidth;
      if (percentage > 100) {
        percentage = 100;
      }
      if (percentage < 0) {
        percentage = 0;
      }
      this.barWidth = percentage + "%";
      this.circleLeft = percentage + "%";
      this.audio.currentTime = (maxduration * percentage) / 100;
      this.audio.play();
    },
    clickProgress(e) {
      this.isTimerPlaying = true;
      this.audio.pause();
      this.updateBar(e.pageX);
    },
    generateVolume() {
      // Convert audio volume back to slider percentage (inverse of logarithmic curve)
      // audio.volume = (percentage/100)^2, so percentage = sqrt(audio.volume) * 100
      let width = Math.sqrt(this.audio.volume) * 100;
      this.volumeWidth = width + "%";
      this.volumeLeft = width + "%";
    },
    updateVolume(x) {
      let volume = this.$refs.volume;
      let right = this.$refs.right;
      let position = x - right.offsetLeft - volume.offsetLeft;
      let percentage = (100 * position) / volume.offsetWidth;
      if (percentage > 100) {
        percentage = 100;
      }
      if (percentage < 0) {
        percentage = 0;
      }
      this.volumeWidth = percentage + "%";
      this.volumeLeft = percentage + "%";
      // Logarithmic curve for natural audio perception
      // Squaring the percentage gives a more natural feel
      this.audio.volume = Math.pow(percentage / 100, 2);
      // Persist to localStorage
      localStorage.setItem('neon_volume', percentage.toString());
    },
    clickVolume(e) {
      // Ignore click if we just finished dragging to prevent double-trigger
      if (!this.isDraggingVolume) {
        this.updateVolume(e.pageX);
      }
    },
    startVolumeDrag(e) {
      e.preventDefault();
      this.isDraggingVolume = true;
      this.updateVolume(e.pageX);
      
      // Add global event listeners for drag
      document.addEventListener('mousemove', this.handleVolumeDrag);
      document.addEventListener('mouseup', this.stopVolumeDrag);
    },
    handleVolumeDrag(e) {
      if (this.isDraggingVolume) {
        this.updateVolume(e.pageX);
      }
    },
    stopVolumeDrag() {
      this.isDraggingVolume = false;
      document.removeEventListener('mousemove', this.handleVolumeDrag);
      document.removeEventListener('mouseup', this.stopVolumeDrag);
    },
    jumpToClick() {
      this.currentTrackIndex = this.index;
      this.currentTrack = this.tracks[this.currentTrackIndex];
      this.pushIndex(this.currentTrackIndex);
      this.isTimerPlaying = true;
      this.refreshPlayer();
    },
    prevTrack() {
      this.transitionName = "scale-in";
      this.isShowCover = false;
      
      if (this.playMode === 'shuffle' && this.shuffledIndices.length > 0) {
        // 随机模式：在打乱的列表中找当前位置，往前移动
        const shufflePos = this.shuffledIndices.indexOf(this.currentTrackIndex);
        if (shufflePos > 0) {
          this.currentTrackIndex = this.shuffledIndices[shufflePos - 1];
        } else {
          this.currentTrackIndex = this.shuffledIndices[this.shuffledIndices.length - 1];
        }
      } else {
        // 顺序模式或单曲循环：正常上一首
        if (this.currentTrackIndex > 0) {
          this.currentTrackIndex--;
        } else {
          this.currentTrackIndex = this.tracks.length - 1;
        }
      }
      
      this.currentTrack = this.tracks[this.currentTrackIndex];
      this.pushIndex(this.currentTrackIndex);
    },
    nextTrack() {
      this.transitionName = "sacle-out";
      this.isShowCover = false;
      
      if (this.playMode === 'shuffle') {
        // 随机模式
        // 如果 shuffledIndices 为空或无效，重新生成
        if (!this.shuffledIndices || this.shuffledIndices.length === 0 || 
            this.shuffledIndices.length !== this.tracks.length) {
          this.generateShuffledIndices();
        }
        
        const shufflePos = this.shuffledIndices.indexOf(this.currentTrackIndex);
        
        if (shufflePos === -1) {
          // 当前索引不在随机列表中，从头开始
          this.currentTrackIndex = this.shuffledIndices[0];
        } else if (shufflePos < this.shuffledIndices.length - 1) {
          // 还有下一首
          this.currentTrackIndex = this.shuffledIndices[shufflePos + 1];
        } else {
          // 播完了，重新打乱并从头开始
          this.generateShuffledIndices();
          this.currentTrackIndex = this.shuffledIndices[0];
        }
      } else {
        // 顺序模式或单曲循环：正常下一首
        if (this.currentTrackIndex < this.tracks.length - 1) {
          this.currentTrackIndex++;
        } else {
          this.currentTrackIndex = 0;
        }
      }
      
      this.currentTrack = this.tracks[this.currentTrackIndex];
      this.pushIndex(this.currentTrackIndex);
    },

    handlePlayerLogic() {
      this.barWidth = 0;
      this.circleLeft = 0;
      this.audio.currentTime = 0;
      this.audio.pause();
      
      if (!this.currentTrack.id || this.currentTrack.id === 0) return;

      getSongUrl(this.currentTrack.id).then((res) => {
        if (res.data && res.data.url) {
          this.audio.src = res.data.url;
          this.skipFailedCount = 0;
          
          // Add event listener to set isPlaying and update cover when audio actually starts
          this.audio.addEventListener('playing', () => {
            this.$store.commit('SetIsPlaying', true);
            // Update cover only when audio actually starts playing
            this.$store.commit('SetCurrentTrackCover', this.currentTrack.cover);
            // Start visualization
            this.startVisualization();
            // 更新锁屏显示的歌曲信息
            this.updateMediaSessionMetadata();
          }, { once: true });
          
          setTimeout(() => {
            if (this.isTimerPlaying) {
              if (this.audioContext && this.audioContext.state === "suspended") {
                this.audioContext.resume();
              }
              
              this.audio.play().catch(e => {
                console.error("Playback failed:", e);
                this.isTimerPlaying = false;
              });
            } else {
              this.audio.pause();
            }
          }, 300);
        } else {
           console.error("Invalid API response structure:", res.data);
           ElMessage.error(res.data.msg || "Failed to play song");
           this.isTimerPlaying = false;
           this.autoSkipFailed();
        }
      }).catch(err => {
         console.error(err);
         ElMessage.error("Network error");
         this.isTimerPlaying = false;
         this.autoSkipFailed();
      });
    },
    autoSkipFailed() {
      this.skipFailedCount++;
      if (this.skipFailedCount < this.tracks.length) {
        console.log(`Skipping failed track, attempt ${this.skipFailedCount}/${this.tracks.length}`);
        this.isTimerPlaying = true;
        setTimeout(() => {
          this.nextTrack();
        }, 500);
      } else {
        console.error("All tracks failed to load");
        ElMessage.error("所有歌曲都无法播放");
        this.skipFailedCount = 0;
      }
    },
    // 播放模式切换
    togglePlayMode() {
      const modes = ['sequence', 'shuffle', 'repeat-one'];
      const currentIndex = modes.indexOf(this.playMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      this.$store.commit('SetPlayMode', nextMode);
      
      // 切换到随机模式时生成随机序列
      if (nextMode === 'shuffle') {
        this.generateShuffledIndices();
      }
      
      // 显示切换提示
      const modeNames = {
        'sequence': '顺序循环',
        'shuffle': '随机播放',
        'repeat-one': '单曲循环'
      };
      ElMessage.success(`已切换为：${modeNames[nextMode]}`);
    },
    // 生成随机播放序列
    generateShuffledIndices() {
      const indices = Array.from({ length: this.tracks.length }, (_, i) => i);
      // Fisher-Yates 洗牌算法
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      this.$store.commit('SetShuffledIndices', indices);
      console.log('[MusicPlayer] Generated shuffled indices:', indices);
    },
    refreshPlayer() {
      this.handlePlayerLogic();
    },
    resetPlayer() {
      this.handlePlayerLogic();
    },
    initialPlayer() {
      let vm = this;
      this.currentTrack = this.tracks[0];
      this.audio = new Audio();
      this.audio.crossOrigin = "anonymous";
      
      if (this.currentTrack.id && this.currentTrack.id !== 0) {
        getSongUrl(this.currentTrack.id).then((res) => {
          if (res.data && res.data.url) {
            this.audio.src = res.data.url;
            this.audio.load();
          } else {
            console.error("Invalid API response structure:", res.data);
            ElMessage.error(res.data.msg || "Failed to play song");
          }
        }).catch(err => {
          console.error("API Error:", err);
          ElMessage.error("Network error");
        });
      }

      this.audio.ontimeupdate = function () {
        vm.generateTime();
      };
      this.audio.onloadedmetadata = function () {
        vm.generateTime();
      };
      this.audio.onended = function () {
        // 单次播放模式（搜索单曲）：播完停止
        if (vm.isSinglePlay) {
          vm.isTimerPlaying = false;
          vm.$store.commit('SetIsPlaying', false);
          vm.stopVisualization();
          return;
        }
        
        // 单曲循环：重新播放当前歌曲
        if (vm.playMode === 'repeat-one') {
          vm.audio.currentTime = 0;
          vm.audio.play().then(() => {
            vm.isTimerPlaying = true;
            vm.$store.commit('SetIsPlaying', true);
          }).catch(err => {
            console.error('[MusicPlayer] Single repeat play failed:', err);
          });
          return;
        }
        
        // 只有一首歌时，直接重新播放（不管是顺序还是随机模式）
        if (vm.tracks.length === 1) {
          vm.audio.currentTime = 0;
          vm.audio.play().then(() => {
            vm.isTimerPlaying = true;
            vm.$store.commit('SetIsPlaying', true);
          }).catch(err => {
            console.error('[MusicPlayer] Single track loop play failed:', err);
          });
          return;
        }
        
        // 顺序循环或随机播放：下一曲
        vm.nextTrack();
        vm.isTimerPlaying = true;
      };
      
      // Add event listener to set isPlaying and update cover when audio starts playing
      this.audio.addEventListener('playing', () => {
        console.log('[MusicPlayer] Initial audio playing - setting isPlaying to true');
        this.$store.commit('SetIsPlaying', true);
        // Update cover when initial audio starts playing
        console.log('[MusicPlayer] Initial audio playing - updating currentTrackCover:', this.currentTrack.cover);
        this.$store.commit('SetCurrentTrackCover', this.currentTrack.cover);
        // Start visualization
        this.startVisualization();
      });
      
      this.audio.load();
      
      // Load saved volume from localStorage
      const savedVolume = localStorage.getItem('neon_volume');
      if (savedVolume !== null) {
        const percentage = parseFloat(savedVolume);
        this.volumeWidth = percentage + "%";
        this.volumeLeft = percentage + "%";
        this.audio.volume = Math.pow(percentage / 100, 2);
      }

      // 检测 iOS/iPadOS 设备
      // iPadOS 13+ Safari 默认伪装成 Mac，需要额外检测触摸能力
      const isIPhone = /iPhone|iPod/.test(navigator.userAgent);
      const isIPad = /iPad/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      this.isIOS = isIPhone || isIPad;
      
      console.log('[MusicPlayer] Device detection:', {
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
        isIOS: this.isIOS
      });
      
      // iOS 上不使用 AudioContext，避免影响后台播放
      // createMediaElementSource 会将 Audio 元素绑定到 AudioContext，
      // 当 iOS 进入后台时，AudioContext 被暂停，连带 Audio 也会停止
      if (!this.audioContext && !this.isIOS) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 1024; // Set FFT size for frequency analysis (higher resolution for precise 120-250Hz range)
        this.audioSource = this.audioContext.createMediaElementSource(this.audio);
        this.audioSource.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        console.log('[MusicPlayer] AudioContext initialized for audio visualization');
      } else if (this.isIOS) {
        console.log('[MusicPlayer] iOS/iPadOS detected - AudioContext disabled for background playback support');
      }
      
      // 初始化 Media Session API
      this.setupMediaSession();
      this.updateMediaSessionMetadata();
    },
    
    // Audio Visualization Methods
    analyzeAudio() {
      if (!this.analyser) return;
      
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);
      
      // === BASS FREQUENCY RANGE: 120-250Hz ===
      // For 44100Hz sample rate and fftSize 1024:
      // Each bin = 44100 / 1024 = ~43.07 Hz
      // Bin 0 = 0-43 Hz
      // Bin 1 = 43-86 Hz
      // Bin 2 = 86-129 Hz
      // Bin 3 = 129-172 Hz (start of 120Hz+ range)
      // Bin 4 = 172-215 Hz
      // Bin 5 = 215-258 Hz (end of 250Hz range)
      // Using bins 3-5 to cover target 120-250Hz range (actual: 129-258Hz)
      const startBin = 3;  // ~129Hz (close to 120Hz)
      const endBin = 5;    // ~258Hz (close to 250Hz)
      const binCount = endBin - startBin + 1;
      
      let sum = 0;
      for (let i = startBin; i <= endBin; i++) {
        sum += dataArray[i];
      }
      const average = sum / binCount;
      const rawIntensity = average / 255;
      
      // === ONSET DETECTION WITH GATE ===
      // Smooth envelope
      const attackRate = 0.8; // Very fast to catch onsets
      const releaseRate = 0.15; // Faster release to reset for next onset
      
      if (rawIntensity > this.envelopeValue) {
        this.envelopeValue += (rawIntensity - this.envelopeValue) * attackRate;
      } else {
        this.envelopeValue += (rawIntensity - this.envelopeValue) * releaseRate;
      }
      
      // Calculate derivative
      const delta = this.envelopeValue - (this.peakValue || this.envelopeValue);
      this.peakValue = this.envelopeValue;
      
      // Check if we're in gate period
      const now = Date.now();
      const timeSinceLastOnset = now - this.lastOnsetTime;
      const isGated = timeSinceLastOnset < this.gateTime;
      
      let transientIntensity = 0;
      
      // Only detect onset if:
      // 1. Delta is positive (rising edge)
      // 2. Delta is above threshold (significant change)
      // 3. Not in gate period
      const onsetThreshold = 0.015; // Minimum delta to consider as onset
      
      if (delta > onsetThreshold && !isGated) {
        // ONSET DETECTED!
        transientIntensity = Math.min(1.0, delta * 30); // Amplify
        this.lastOnsetTime = now; // Reset gate
        // Set smoothed value to peak immediately
        this.smoothedIntensity = transientIntensity;
      } else if (!isGated && delta > 0.005) {
        // Very subtle response for small changes when not gated
        transientIntensity = Math.min(0.3, delta * 10);
        // Use the higher of new value or decaying old value
        this.smoothedIntensity = Math.max(transientIntensity, this.smoothedIntensity * this.decayRate);
      } else {
        // No new onset - just decay the smoothed value
        this.smoothedIntensity *= this.decayRate;
      }
      
      // Use smoothed value for output
      const outputIntensity = this.smoothedIntensity;
      
      // Update album scale
      const minScale = 1.0;
      const maxScale = 1.2;
      this.albumScale = minScale + outputIntensity * (maxScale - minScale);
      
      // Update audio intensity in Vuex
      this.$store.commit('SetAudioIntensity', outputIntensity);
      
      // Continue animation loop
      this.visualizationFrameId = requestAnimationFrame(this.analyzeAudio);
    },
    
    startVisualization() {
      if (!this.visualizationFrameId && this.analyser) {
        this.analyzeAudio();
      }
    },
    
    stopVisualization() {
      if (this.visualizationFrameId) {
        cancelAnimationFrame(this.visualizationFrameId);
        this.visualizationFrameId = null;
        // Reset scale to default
        this.albumScale = 1.0;
        // Reset audio intensity
        this.$store.commit('SetAudioIntensity', 0.0);
        // Reset envelope follower
        this.envelopeValue = 0.0;
        this.peakValue = 0.0;
        this.lastOnsetTime = 0;
        this.smoothedIntensity = 0.0;
      }
    },
    
    toggleImmersiveMode() {
      this.$store.commit('ToggleImmersiveMode');
    },
    
    // Media Session API - 锁屏控制和元数据
    setupMediaSession() {
      if ('mediaSession' in navigator) {
        // 设置控制按钮
        navigator.mediaSession.setActionHandler('play', () => {
          this.audio.play();
          this.isTimerPlaying = true;
          this.$store.commit('SetIsPlaying', true);
          this.startVisualization();
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
          this.audio.pause();
          this.isTimerPlaying = false;
          this.$store.commit('SetIsPlaying', false);
          this.stopVisualization();
        });
        
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          this.prevTrack();
        });
        
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          this.nextTrack();
        });
        
        // 只在非 iOS/iPadOS 设备上注册快进/快退控制
        // 在 iOS/iPadOS Safari 上，如果同时注册了 seek 和 track 控制，
        // 系统会优先显示快进/快退按钮，隐藏上一首/下一首按钮
        // 所以 iOS 上只保留 previoustrack/nexttrack，让锁屏和控制中心显示切歌按钮
        if (!this.isIOS) {
          navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            const skipTime = details.seekOffset || 10;
            this.audio.currentTime = Math.max(this.audio.currentTime - skipTime, 0);
          });
          
          navigator.mediaSession.setActionHandler('seekforward', (details) => {
            const skipTime = details.seekOffset || 10;
            this.audio.currentTime = Math.min(this.audio.currentTime + skipTime, this.audio.duration || 0);
          });
        }
        
        console.log('[MusicPlayer] Media Session API initialized', this.isIOS ? '(iOS - track controls only)' : '(full controls)');
      }
    },
    
    updateMediaSessionMetadata() {
      if ('mediaSession' in navigator && this.currentTrack) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: this.currentTrack.name || 'Unknown',
          artist: this.currentTrack.artist || 'Unknown Artist',
          album: this.currentTrack.album || 'Unknown Album',
          artwork: this.currentTrack.cover ? [
            { src: this.currentTrack.cover, sizes: '96x96', type: 'image/jpeg' },
            { src: this.currentTrack.cover, sizes: '128x128', type: 'image/jpeg' },
            { src: this.currentTrack.cover, sizes: '256x256', type: 'image/jpeg' },
            { src: this.currentTrack.cover, sizes: '512x512', type: 'image/jpeg' }
          ] : []
        });
        console.log('[MusicPlayer] Media Session metadata updated:', this.currentTrack.name);
      }
    },
    seekToTime(time) {
      if (this.audio && !isNaN(time)) {
        this.audio.currentTime = time;
        if (!this.isTimerPlaying) {
          this.audio.play();
          this.isTimerPlaying = true;
          this.$store.commit('SetIsPlaying', true);
          this.startVisualization();
        }
      }
    }
  },
  created() {
    this.initialPlayer();
  },
  beforeUnmount() {
    // Clean up visualization
    this.stopVisualization();
  }
};

</script>

<style lang="scss">
.playerwarper {
  overflow: hidden;
  padding: 65px 0px 0 0px;
  bottom: 0px;
  position: fixed;
  display: flex;
  z-index: 10; /* Increased to ensure it's top-most */
  zoom: 1;
  bottom: 0;
  left: 0;
  right: 0;
  height: 105px;
  width: 100%;
}

.musicplayer {
  display: flex;
  flex-direction: row;
  justify-content: center;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 0;
  width: 100%;
  height: 65px;
  width: 100%;
  height: 65px;
  /* background-color: rgba(255, 255, 255, 0.6); Removed for liquid effect */
  border-top-left-radius: 32px;
  border-top-right-radius: 32px;
  min-width: 0; // 允许响应式收缩
}
.musicplayer-content {
  display: flex;
  justify-content: center; /* Restore centering */
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 5;
}
.musicplayer-left {
  display: flex;
  position: absolute;
  height: 100%;
  left: 0px;
}

.album-info {
  display: flex;
  flex-direction: row;
  justify-content: center;
  padding: 0 0 0 85px;
  height: 100%;
  border-top-left-radius: 32px;
}

.player-cover__item {
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  width: 80px;
  height: 80px;
  border-radius: 15px;
  margin-top: -30px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05) !important;
  }

  &:before {
    content: "";
    background: inherit;
    width: 80px;
    height: 80px;
    box-shadow: 0px 10px 40px 0px rgba(76, 70, 124, 0.5);
    display: block;
    z-index: 1;
    position: absolute;
    top: 30px;
    transform: scale(0.9);
    filter: blur(10px);
    opacity: 0.9;
    border-radius: 15px;
  }

  &:after {
    content: "";
    background: inherit;
    width: 80px;
    height: 80px;
    box-shadow: 0px 20px 20px 0px rgba(26, 26, 26, 0.66);
    display: block;
    z-index: 2;
    position: absolute;
    border-radius: 15px;
  }
}

/* 专辑封面覆盖层 */
.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 80px;
  height: 80px;
  border-radius: 15px;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 3;

  i {
    font-size: 32px;
    color: white;
    opacity: 0.9;
  }
}

.player-cover__item:hover .cover-overlay {
  opacity: 1;
}


.album-right {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 10px 0 16px;
}

.musicplayer-middle {
  display: flex;
  flex-direction: row;
}

.musicplayer-right {
  display: flex;
  flex-direction: row;
  position: absolute;
  height: 100%;
  right: 0px;
}

.player-controls {
  display: flex;
  flex-direction: column;
  margin-top: -30px;
}

.progress {
  display: flex;
  flex-direction: column;
  padding: 10px 0 0 0;
}

.progress_bar {
  height: 6px;
  width: 100%;
  cursor: pointer;
  background-color: rgba(175, 175, 175, 0.6);
  display: inline-block;
  border-radius: 10px;
}

.progress_current {
  height: inherit;
  width: 0%;
  background-color: rgba(153, 153, 153, 0.6);
  border-radius: 10px;
}

.progress_time,
.progress_duration {
  font-size: 10px;
}

.time {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 2px 0 0 0;
}

.volume-control {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  padding: 0 180px 0 0;
  border-top-right-radius: 32px;
  height: 100%;
}

.volume-control_row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin: auto;
}

.bar {
  height: 6px;
  width: 100px;
  cursor: pointer;
  background-color: rgba(175, 175, 175, 0.6);
  display: inline-block;
  border-radius: 10px;
  margin: auto;
}
.current-volume {
  height: inherit;
  width: 0%;
  background-color: rgba(153, 153, 153, 0.6);
  border-radius: 10px;
}

.volume-control_speaker {
  margin: auto;
  font-size: 18px;
  padding: 0 10px 0 0;
}

.playlist-btn {
  margin: auto;
  font-size: 20px;
  padding: 0 0 0 15px;
  cursor: pointer;
  color: rgba(80, 80, 80, 0.9);
  transition: all 0.2s ease;
  
  &:hover {
    color: rgba(0, 0, 0, 0.9);
  }
}

.track-control {
  display: flex;
  flex-direction: row;
  justify-content: center;
  border-radius: 24px;
  background-color: #ffffff;
  height: 64px;
  width: 280px;
  z-index: 3;
}

.track-control_row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: auto;
  margin-bottom: auto;
  width: 75%;
  height: 100%;
}

.track-control_icon {
  margin: auto;
  font-size: 24px;
  color: rgba(153, 153, 153, 0.6);
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}
.track-control_icon:hover {
  margin: auto;
  font-size: 24px;
  color: rgba(0, 0, 0, 0.6);
}

.track-control_iconPlay {
  margin: auto;
  font-size: 50px;
  color: rgba(153, 153, 153, 0.6);
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}
.track-control_iconPlay:hover {
  margin: auto;
  font-size: 50px;
  color: rgba(0, 0, 0, 0.6);
}

// 移动端和平板隐藏音量条
@media screen and (max-width: 1366px) {
  .volume-control_speaker,
  .volume-control_bar {
    display: none;
  }
  
  .volume-control {
    padding: 0 20px 0 0;
  }
  
  .musicplayer {
    min-width: 0;
  }
}
</style>