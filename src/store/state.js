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
    audioIntensity: 0.0,
    isImmersiveMode: false,
    currentTime: 0,
    seekTime: null,
    lyricDarkMode: false,
    playMode: 'sequence',
    isSinglePlay: false,
    shuffledIndices: [],
    isDarkMode: false
}

export default state;
