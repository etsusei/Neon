const state = {
    tracks: [{
        id: 0,
        name: "",
        artist: "",
        album: ""
    }],
    playback: {
        requestedTrackIndex: undefined,
        currentTrackIndex: null,
        isPlaying: false,
        coverImage: "",
        currentTime: 0,
        seekTime: null,
        mode: "sequence",
        isSingleTrack: false,
        shuffledIndices: []
    },
    audioIntensity: 0.0,
    isImmersiveMode: false,
    lyricDarkMode: false,
    isDarkMode: false,
    isPlayerExpanded: false // 移动端播放器是否展开为全屏

}

export default state;
