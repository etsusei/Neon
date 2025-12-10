<template>
  <div class="skeleton-image" :class="{ 'loaded': isLoaded, 'circle': circle }">
    <div v-if="!isLoaded" class="skeleton-placeholder">
      <div class="skeleton-shimmer"></div>
    </div>
    <img 
      v-show="isLoaded"
      :src="src"
      :alt="alt"
      @load="handleLoad"
      @error="handleError"
      referrerpolicy="no-referrer"
    />
    <div v-if="hasError" class="skeleton-error">
      <i class="fa fa-image"></i>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SkeletonImage',
  props: {
    src: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    circle: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isLoaded: false,
      hasError: false
    };
  },
  watch: {
    src() {
      // 当 src 变化时重置状态
      this.isLoaded = false;
      this.hasError = false;
    }
  },
  methods: {
    handleLoad() {
      this.isLoaded = true;
      this.hasError = false;
    },
    handleError() {
      this.hasError = true;
      this.isLoaded = true;
    }
  }
};
</script>

<style lang="scss" scoped>
.skeleton-image {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  
  &.circle {
    border-radius: 50%;
    
    .skeleton-placeholder {
      border-radius: 50%;
    }
  }
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.3s ease;
  }
}

.skeleton-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  overflow: hidden;
  border-radius: inherit;
}

.skeleton-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg, 
    transparent, 
    rgba(255, 255, 255, 0.4), 
    transparent
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.skeleton-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  color: #999;
  
  i {
    font-size: 24px;
  }
}

.loaded {
  .skeleton-placeholder {
    opacity: 0;
    transition: opacity 0.3s ease;
  }
}
</style>
