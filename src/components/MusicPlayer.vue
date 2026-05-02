<template>
  <div class="playerwarper">
    <div class="musicplayer">
      <liquid-card border-radius="32px 32px 0 0" custom-class="player-liquid-glass" :overflow-visible="true">
        <div class="musicplayer-content">
          <div class="musicplayer-left">
            <player-track-info
              :track="currentTrack"
              :album-scale="albumScale"
              @toggle-immersive-mode="toggleImmersiveMode"
            />
          </div>
          <div class="musicplayer-middle">
            <player-controls
              :is-playing="isTimerPlaying"
              :play-mode="playMode"
              :play-mode-title="playModeTitle"
              :bar-width="barWidth"
              :current-time="currentTime"
              :duration="duration"
              @play="play"
              @prev-track="prevTrack"
              @next-track="nextTrack"
              @toggle-play-mode="togglePlayMode"
              @seek-percentage="seekToPercentage"
            />
          </div>
          <div class="musicplayer-right">
            <player-volume
              :volume-width="volumeWidth"
              @set-volume-percentage="setVolumePercentage"
              @open-playlist="showPlaylist = true"
            />
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
import AudioIntensityAnalyzer from "../utils/audioIntensityAnalyzer";
import PlayerTrackInfo from "./player/PlayerTrackInfo.vue";
import PlayerControls from "./player/PlayerControls.vue";
import PlayerVolume from "./player/PlayerVolume.vue";
export default {
  components: {
    PlaylistPopup,
    LiquidCard,
    PlayerTrackInfo,
    PlayerControls,
    PlayerVolume
  },
  data() {
    return {
      audio: null,
      barWidth: "0%",
      duration: "00:00",
      currentTime: "00:00",
      isTimerPlaying: false,
      currentTrack: {},
      currentTrackIndex: 0,
      transitionName: null,
      volumeWidth: "0%",
      skipFailedCount: 0,
      audioContext: null,
      audioSource: null,
      analyser: null,
      // Audio visualization
      albumScale: 1.0,
      visualizationFrameId: null,
      audioAnalyzer: new AudioIntensityAnalyzer(),
      showPlaylist: false,
      // iOS background playback support
      isIOS: false
    };
  },
  computed: {
    ...mapGetters(["tracks", "trackChangeRequest"]),
    requestedTrackIndex() {
      return this.trackChangeRequest;
    },
    seekTime() {
      return this.$store.state.playback.seekTime;
    },
    playMode() {
      return this.$store.state.playback.mode;
    },
    isSingleTrackPlayback() {
      return this.$store.state.playback.isSingleTrack;
    },
    shuffledIndices() {
      return this.$store.state.playback.shuffledIndices;
    },
    playModeTitle() {
      const titles = {
        'sequence': 'Sequence',
        'shuffle': 'Shuffle',
        'repeat-one': 'Repeat One'
      };
      return titles[this.playMode] || 'Sequence';
    }
  },
  watch: {
    tracks: {
      handler: function (newtrack, oldtrack) {
        // Reload the active song when the playlist content changes.
        // JSON comparison keeps this tied to actual content changes.
        if (oldtrack && newtrack && JSON.stringify(newtrack) !== JSON.stringify(oldtrack)) {
          console.log('[MusicPlayer] Tracks changed, refreshing player');
          // Wait for the store index update before jumping.
          this.$nextTick(() => {
            this.jumpToClick();
          });
        }
      },
      deep: true,
      immediate: false
    },
    requestedTrackIndex: {
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
        // Reset seekTime after consuming it.
        this.$store.commit('SetPlaybackSeekTime', null);
      }
    }
  },
  methods: {
    ...mapMutations({ setCurrentTrackIndex: "SetCurrentTrackIndex" }),
    play() {
      if (this.audio.paused) {
        this.audio.play();
        this.isTimerPlaying = true;
        this.$store.commit('SetPlaybackActive', true);
        this.startVisualization();
        if (this.audioContext && this.audioContext.state === "suspended") {
          this.audioContext.resume();
        }
      } else {
        this.audio.pause();
        this.isTimerPlaying = false;
        this.$store.commit('SetPlaybackActive', false);
        this.stopVisualization();
      }
    },
    generateTime() {
      let width = (100 / this.audio.duration) * this.audio.currentTime;
      this.barWidth = width + "%";
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
      // Sync current time to the store for lyrics.
      this.$store.commit('SetPlaybackTime', this.audio.currentTime);
    },
    seekToPercentage(percentage) {
      let maxduration = this.audio.duration;
      if (percentage > 100) {
        percentage = 100;
      }
      if (percentage < 0) {
        percentage = 0;
      }
      this.barWidth = percentage + "%";
      this.audio.currentTime = (maxduration * percentage) / 100;
      this.audio.play();
      this.isTimerPlaying = true;
    },
    generateVolume() {
      // Convert audio volume back to slider percentage (inverse of logarithmic curve)
      // audio.volume = (percentage/100)^2, so percentage = sqrt(audio.volume) * 100
      let width = Math.sqrt(this.audio.volume) * 100;
      this.volumeWidth = width + "%";
    },
    setVolumePercentage(percentage) {
      if (percentage > 100) {
        percentage = 100;
      }
      if (percentage < 0) {
        percentage = 0;
      }
      this.volumeWidth = percentage + "%";
      // Logarithmic curve for natural audio perception
      // Squaring the percentage gives a more natural feel
      this.audio.volume = Math.pow(percentage / 100, 2);
      // Persist to localStorage
      localStorage.setItem('neon_volume', percentage.toString());
    },
    jumpToClick() {
      this.currentTrackIndex = this.requestedTrackIndex;
      this.currentTrack = this.tracks[this.currentTrackIndex];
      this.setCurrentTrackIndex(this.currentTrackIndex);
      this.isTimerPlaying = true;
      this.refreshPlayer();
    },
    prevTrack() {
      this.transitionName = "scale-in";
      this.isShowCover = false;
      
      if (this.playMode === 'shuffle' && this.shuffledIndices.length > 0) {
        // Shuffle mode: move to the previous item in the shuffled order.
        const shufflePos = this.shuffledIndices.indexOf(this.currentTrackIndex);
        if (shufflePos > 0) {
          this.currentTrackIndex = this.shuffledIndices[shufflePos - 1];
        } else {
          this.currentTrackIndex = this.shuffledIndices[this.shuffledIndices.length - 1];
        }
      } else {
        // Sequence or repeat-one mode: move to the previous track normally.
        if (this.currentTrackIndex > 0) {
          this.currentTrackIndex--;
        } else {
          this.currentTrackIndex = this.tracks.length - 1;
        }
      }
      
      this.currentTrack = this.tracks[this.currentTrackIndex];
      this.setCurrentTrackIndex(this.currentTrackIndex);
    },
    nextTrack() {
      this.transitionName = "sacle-out";
      this.isShowCover = false;
      
      if (this.playMode === 'shuffle') {
        // Shuffle mode.
        // Regenerate the order if it is missing or stale.
        if (!this.shuffledIndices || this.shuffledIndices.length === 0 || 
            this.shuffledIndices.length !== this.tracks.length) {
          this.generateShuffledIndices();
        }
        
        const shufflePos = this.shuffledIndices.indexOf(this.currentTrackIndex);
        
        if (shufflePos === -1) {
          // Current index is not in the shuffled list; start from the top.
          this.currentTrackIndex = this.shuffledIndices[0];
        } else if (shufflePos < this.shuffledIndices.length - 1) {
          // Continue through the shuffled list.
          this.currentTrackIndex = this.shuffledIndices[shufflePos + 1];
        } else {
          // Re-shuffle after reaching the end.
          this.generateShuffledIndices();
          this.currentTrackIndex = this.shuffledIndices[0];
        }
      } else {
        // Sequence or repeat-one mode: move to the next track normally.
        if (this.currentTrackIndex < this.tracks.length - 1) {
          this.currentTrackIndex++;
        } else {
          this.currentTrackIndex = 0;
        }
      }
      
      this.currentTrack = this.tracks[this.currentTrackIndex];
      this.setCurrentTrackIndex(this.currentTrackIndex);
    },

    handlePlayerLogic() {
      this.barWidth = "0%";
      this.audio.currentTime = 0;
      this.audio.pause();
      
      if (!this.currentTrack.id || this.currentTrack.id === 0) return;

      getSongUrl(this.currentTrack.id).then((res) => {
        if (res.data && res.data.url) {
          this.audio.src = res.data.url;
          this.skipFailedCount = 0;
          
          // Add event listener to set isPlaying and update cover when audio actually starts
          this.audio.addEventListener('playing', () => {
            this.$store.commit('SetPlaybackActive', true);
            // Update cover only when audio actually starts playing
            this.$store.commit('SetPlaybackCover', this.currentTrack.cover);
            // Start visualization
            this.startVisualization();
            // Update lock screen metadata.
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
        ElMessage.error("All tracks failed to play");
        this.skipFailedCount = 0;
      }
    },
    // Playback mode switching.
    togglePlayMode() {
      const modes = ['sequence', 'shuffle', 'repeat-one'];
      const currentIndex = modes.indexOf(this.playMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      this.$store.commit('SetPlaybackMode', nextMode);
      
      // Generate a fresh shuffled order when entering shuffle mode.
      if (nextMode === 'shuffle') {
        this.generateShuffledIndices();
      }
      
      // Show a short feedback message.
      const modeNames = {
        'sequence': 'Sequence',
        'shuffle': 'Shuffle',
        'repeat-one': 'Repeat One'
      };
      ElMessage.success(`Switched to ${modeNames[nextMode]}`);
    },
    // Generate shuffled playback order.
    generateShuffledIndices() {
      const indices = Array.from({ length: this.tracks.length }, (_, i) => i);
      // Fisher-Yates shuffle.
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      this.$store.commit('SetShuffledPlaybackOrder', indices);
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
        // Single-play mode for search results stops at the end.
        if (vm.isSingleTrackPlayback) {
          vm.isTimerPlaying = false;
          vm.$store.commit('SetPlaybackActive', false);
          vm.stopVisualization();
          return;
        }
        
        // Repeat-one mode: replay the current track.
        if (vm.playMode === 'repeat-one') {
          vm.audio.currentTime = 0;
          vm.audio.play().then(() => {
            vm.isTimerPlaying = true;
            vm.$store.commit('SetPlaybackActive', true);
          }).catch(err => {
            console.error('[MusicPlayer] Single repeat play failed:', err);
          });
          return;
        }
        
        // With one track, loop it regardless of sequence or shuffle mode.
        if (vm.tracks.length === 1) {
          vm.audio.currentTime = 0;
          vm.audio.play().then(() => {
            vm.isTimerPlaying = true;
            vm.$store.commit('SetPlaybackActive', true);
          }).catch(err => {
            console.error('[MusicPlayer] Single track loop play failed:', err);
          });
          return;
        }
        
        // Sequence or shuffle mode: advance to the next track.
        vm.nextTrack();
        vm.isTimerPlaying = true;
      };
      
      // Add event listener to set isPlaying and update cover when audio starts playing
      this.audio.addEventListener('playing', () => {
        console.log('[MusicPlayer] Initial audio playing - setting isPlaying to true');
        this.$store.commit('SetPlaybackActive', true);
        // Update cover when initial audio starts playing
        console.log('[MusicPlayer] Initial audio playing - updating playback cover:', this.currentTrack.cover);
        this.$store.commit('SetPlaybackCover', this.currentTrack.cover);
        // Start visualization
        this.startVisualization();
      });
      
      this.audio.load();
      
      // Load saved volume from localStorage
      const savedVolume = localStorage.getItem('neon_volume');
      if (savedVolume !== null) {
        const percentage = parseFloat(savedVolume);
        this.volumeWidth = percentage + "%";
        this.audio.volume = Math.pow(percentage / 100, 2);
      }

      // Detect iOS/iPadOS. iPadOS 13+ Safari can report itself as Mac,
      // so touch capability is included in the check.
      const isIPhone = /iPhone|iPod/.test(navigator.userAgent);
      const isIPad = /iPad/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      this.isIOS = isIPhone || isIPad;
      
      console.log('[MusicPlayer] Device detection:', {
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
        isIOS: this.isIOS
      });
      
      // Avoid AudioContext on iOS so background playback is not interrupted.
      // createMediaElementSource binds the audio element to the context, which
      // can be suspended when Safari moves to the background.
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
      
      // Initialize Media Session API.
      this.setupMediaSession();
      this.updateMediaSessionMetadata();
    },
    
    // Audio Visualization Methods
    analyzeAudio() {
      if (!this.analyser) return;
      
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);
      
      const outputIntensity = this.audioAnalyzer.analyzeFrequencyData(dataArray);
      
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
        this.audioAnalyzer.reset();
      }
    },
    
    toggleImmersiveMode() {
      this.$store.commit('ToggleImmersiveMode');
    },
    
    // Media Session API for lock-screen controls and metadata.
    setupMediaSession() {
      if ('mediaSession' in navigator) {
        // Register transport controls.
        navigator.mediaSession.setActionHandler('play', () => {
          this.audio.play();
          this.isTimerPlaying = true;
          this.$store.commit('SetPlaybackActive', true);
          this.startVisualization();
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
          this.audio.pause();
          this.isTimerPlaying = false;
          this.$store.commit('SetPlaybackActive', false);
          this.stopVisualization();
        });
        
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          this.prevTrack();
        });
        
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          this.nextTrack();
        });
        
        // On iOS/iPadOS Safari, seek actions can replace previous/next track
        // buttons in system UI, so only register seek actions elsewhere.
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
          this.$store.commit('SetPlaybackActive', true);
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
  min-width: 0; // Allow responsive shrinking.
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

/* Album cover overlay */
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

// Hide the volume bar on mobile and tablet widths.
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
