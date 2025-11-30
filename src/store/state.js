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
    audioIntensity: 0.0  // 0.0 - 1.0, represents low-frequency audio intensity
}

export default state;