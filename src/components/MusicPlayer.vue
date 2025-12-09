<template>
  <div class="playerwarper">
    <div class="musicplayer">
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
              <div class="track-control_icon">
                <i class="fa fa-random"></i>
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
              <div class="bar" @click="clickVolume" ref="volume">
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
    <playlist-popup :show="showPlaylist" @close="showPlaylist = false" />
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import { mapMutations } from "vuex";
import { getSongUrl } from "../api/neteaseApi";
import { ElMessage } from "element-plus";
import PlaylistPopup from "./PlaylistPopup.vue";
export default {
  components: {
    PlaylistPopup
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
      showPlaylist: false // 播放列表弹窗
    };
  },
  computed: {
    ...mapGetters(["tracks", "index"]),
    seekTime() {
      return this.$store.state.seekTime;
    }
  },
  watch: {
    tracks: {
      handler: function (newtrack, oldtrack) {
        if (!newtrack === oldtrack) {
          this.initialPlayer();
        }
      },
      deep: true,
      immediate: true,
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
      let width = 100 * this.audio.volume;
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
      this.audio.volume = (1 * percentage) / 100;
    },
    clickVolume(e) {
      this.updateVolume(e.pageX);
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
      if (this.currentTrackIndex > 0) {
        this.currentTrackIndex--;
      } else {
        this.currentTrackIndex = this.tracks.length - 1;
      }
      this.currentTrack = this.tracks[this.currentTrackIndex];
      this.pushIndex(this.currentTrackIndex);
      // Note: resetPlayer() removed - index watcher will handle refreshing via jumpToClick()
    },
    nextTrack() {
      this.transitionName = "sacle-out";
      this.isShowCover = false;
      if (this.currentTrackIndex < this.tracks.length - 1) {
        this.currentTrackIndex++;
      } else {
        this.currentTrackIndex = 0;
      }
      this.currentTrack = this.tracks[this.currentTrackIndex];
      this.pushIndex(this.currentTrackIndex);
      // Note: resetPlayer() removed - index watcher will handle refreshing via jumpToClick()
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
        vm.nextTrack();
        this.isTimerPlaying = true;
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

      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 1024; // Set FFT size for frequency analysis (higher resolution for precise 120-250Hz range)
        this.audioSource = this.audioContext.createMediaElementSource(this.audio);
        this.audioSource.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      }
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
  z-index: 5;
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
  background-color: rgba(255, 255, 255, 0.6);
  border-top-left-radius: 32px;
  border-top-right-radius: 32px;
  min-width: 900px;
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
  font-size: 18px;
  padding: 0 0 0 15px;
  cursor: pointer;
  color: rgba(153, 153, 153, 0.8);
  transition: all 0.2s ease;
  
  &:hover {
    color: rgba(0, 0, 0, 0.7);
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
</style>