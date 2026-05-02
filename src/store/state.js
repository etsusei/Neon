const state = {
    tracks: [{
        id: 0,
        name: "",
        artist: "",
        album: "",
        source: ""
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
    isDarkMode: false
}

export default state;
