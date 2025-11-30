<template>
  <div class="frame">
    <div class="frame-bg">
      <img
        class="bg-color album-artwork"
        src="https://p1.music.126.net/6Hrz_bIYDBJ3z272Kojvkg==/109951166514155566.jpg"
      />
      <img
        class="bg-black album-artwork"
        src="https://p1.music.126.net/6Hrz_bIYDBJ3z272Kojvkg==/109951166514155566.jpg"
      />
    </div>
  </div>
</template>

<script>
export default {};
</script>

<style lang="scss">
html,
body {
  min-height: 100vh;
}
html {
  font-size: 62.5%;
}
body {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Helvetica", "Arial", sans-serif;
  font-weight: bold;
  background: #060b21;
}
* {
  box-sizing: border-box;
}

.frame {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
  color: white;
  margin: 2em;
  padding-top: 2em;
  border-radius: 2em;
  //box-shadow: 0 4px 10px rgba(0, 0, 0, 0.75), 0 8px 30px rgba(0, 0, 0, 0.5);
//   &:before {
//     content: "";
//     display: block;
//     width: 4em;
//     height: 0.6em;
//     background: white;
//     margin: 0 auto;
//     z-index: 10;
//     border-radius: 10em;
//     mix-blend-mode: multiply;
//   }

  //-----Background
  &-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: 0;
    z-index: 0;
    overflow: hidden;
    border-radius: 2em;
    .bg-color {
      width: 200%;
      position: absolute;
      border-radius: 100em;
      animation: rotate 75s linear infinite;
    }
    .bg-black {
      width: 200%;
      position: absolute;
      border-radius: 100em;
      animation: rotate 60s linear infinite;
    }
    .bg-color {
      right: 0;
      top: 0;
      filter: blur(30px);
      z-index: 10;
      mix-blend-mode: lighten;
    }
    .bg-black {
      left: 0;
      bottom: 0;
      filter: blur(30px);
      z-index: 1;
      animation-direction: reverse;
      animation-delay: 3s;
    }
  }
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(-360deg);
  }
}
</style>