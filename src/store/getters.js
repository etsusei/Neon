const getters = {
    tracks: state => state.tracks,

    trackChangeRequest: state => state.playback.requestedTrackIndex,
    currentTrackIndex: state => state.playback.currentTrackIndex,
    currentTrack: state => {
        const index = state.playback.currentTrackIndex;
        return index !== null ? state.tracks[index] : null;
    },
    isPlaybackActive: state => state.playback.isPlaying,
    playbackCoverImage: state => state.playback.coverImage,
    playbackCurrentTime: state => state.playback.currentTime,
    playbackSeekTime: state => state.playback.seekTime,
    playbackMode: state => state.playback.mode,
    isSingleTrackPlayback: state => state.playback.isSingleTrack,
    shuffledPlaybackOrder: state => state.playback.shuffledIndices,

    // Legacy getter names kept for components that still expect them.
    index: state => state.playback.requestedTrackIndex,
    currentIndex: state => state.playback.currentTrackIndex,
    isPlaying: state => state.playback.isPlaying,
    currentTrackCover: state => state.playback.coverImage,
    currentTime: state => state.playback.currentTime,
    seekTime: state => state.playback.seekTime,
    playMode: state => state.playback.mode,
    isSinglePlay: state => state.playback.isSingleTrack,
    shuffledIndices: state => state.playback.shuffledIndices
}

export default getters;
