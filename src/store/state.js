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
    lyricDarkMode: false,  // 歌词深色模式（背景暗时用白色歌词）
    // 播放模式
    playMode: 'sequence',  // 'sequence' 顺序循环 | 'shuffle' 随机播放 | 'repeat-one' 单曲循环
    isSinglePlay: false,   // 搜索单曲时为 true，只播放一次
    shuffledIndices: []    // 随机播放时的打乱索引
}

export default state;