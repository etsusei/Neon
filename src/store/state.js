const state = {
    tracks: [{
        id: 0,
        name: "",
        artist: "",
        album: "",
        source: ""
    }],
    index: undefined,
    currentIndex: null,
    isPlaying: false,
    currentTrackCover: '',
    audioIntensity: 0.0,  // 0.0 - 1.0, represents low-frequency audio intensity
    isImmersiveMode: false,  // 沉浸式背景观看模式
    currentTime: 0,  // 当前播放时间（秒）
    seekTime: null,  // 歌词跳转时间
    lyricDarkMode: false  // 歌词深色模式（背景暗时用白色歌词）
}

export default state;