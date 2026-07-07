<template>
  <div class="album-info">
    <div
      class="player-cover__item"
      @click="$emit('toggle-immersive-mode')"
      :style="{
        backgroundImage: `url(${track.cover})`,
        transform: `scale(${albumScale})`,
        transition: 'transform 0.1s ease-out'
      }"
    >
      <div class="cover-overlay">
        <i class="fa fa-eye"></i>
      </div>
    </div>
    <div class="album-right">
      <!-- 两行共用同一循环周期(取较长者)，停留/起步/归位时刻同步 -->
      <marquee-text
        class="album-right_name"
        :text="track.name"
        :cycle="sharedCycle"
        @measure="nameCycle = $event"
      />
      <marquee-text
        class="album-right_info"
        :text="track.artist"
        :cycle="sharedCycle"
        @measure="infoCycle = $event"
      />
    </div>
  </div>
</template>

<script>
import MarqueeText from '../MarqueeText.vue';

export default {
  name: 'PlayerTrackInfo',
  components: {
    MarqueeText
  },
  props: {
    track: {
      type: Object,
      required: true
    },
    albumScale: {
      type: Number,
      default: 1
    }
  },
  emits: ['toggle-immersive-mode'],
  data() {
    return {
      nameCycle: 0,
      infoCycle: 0
    };
  },
  computed: {
    // 两行的共同循环周期：取各自然周期的较大值
    sharedCycle() {
      return Math.max(this.nameCycle, this.infoCycle);
    }
  }
};
</script>
