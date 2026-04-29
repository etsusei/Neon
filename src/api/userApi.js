import axios from "axios"

const baseUrl = process.env.VUE_APP_API_BASE_URL || 'https://neon.zeabur.app/'

// 获取存储的 token
const getToken = () => localStorage.getItem('auth_token')

// 创建带认证的 axios 实例
const authAxios = axios.create({
    baseURL: baseUrl
})

authAxios.interceptors.request.use(config => {
    const token = getToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ========== 认证 API ==========

export const login = (username, password) => {
    return axios.post(`${baseUrl}api/auth/login`, { username, password })
}

export const getCurrentUser = () => {
    return authAxios.get('api/auth/me')
}

export const updateProfile = (data) => {
    return authAxios.put('api/auth/profile', data)
}

// ========== 歌单 API ==========

export const getMyPlaylists = () => {
    return authAxios.get('api/playlists')
}

export const createPlaylist = (name, cover) => {
    return authAxios.post('api/playlists', { name, cover })
}

export const deletePlaylist = (id) => {
    return authAxios.delete(`api/playlists/${id}`)
}

export const getPlaylistSongs = (id) => {
    return authAxios.get(`api/playlists/${id}/songs`)
}

export const addSongToPlaylist = (playlistId, song) => {
    return authAxios.post(`api/playlists/${playlistId}/songs`, {
        song_id: song.id,
        song_name: song.name,
        artist: song.artist,
        album: song.album,
        cover: song.cover
    })
}

export const removeSongFromPlaylist = (playlistId, songId) => {
    return authAxios.delete(`api/playlists/${playlistId}/songs/${songId}`)
}

// ========== 导出/导入 API ==========

export const exportPlaylists = () => {
    return authAxios.get('api/export')
}

export const importPlaylists = (data) => {
    return authAxios.post('api/export', data)
}
