import { apiClient } from "./http"

// ========== Admin API（全部需要管理员 token）==========

export const getAdminStats = () => {
    return apiClient.get('api/admin/stats')
}

// ---------- 用户管理 ----------

export const getAdminUsers = ({ page = 1, pageSize = 10, search = '' } = {}) => {
    return apiClient.get('api/admin/users', { params: { page, pageSize, search } })
}

export const createAdminUser = ({ username, password, is_admin = false }) => {
    return apiClient.post('api/admin/users', { username, password, is_admin })
}

// data: { password?: string, is_admin?: boolean }
export const updateAdminUser = (id, data) => {
    return apiClient.put(`api/admin/users/${id}`, data)
}

export const deleteAdminUser = (id) => {
    return apiClient.delete(`api/admin/users/${id}`)
}

// ---------- 歌单管理 ----------

export const getAdminPlaylists = ({ page = 1, pageSize = 10, search = '', user_id = null } = {}) => {
    const params = { page, pageSize, search }
    if (user_id) params.user_id = user_id
    return apiClient.get('api/admin/playlists', { params })
}

export const getAdminPlaylistDetail = (id) => {
    return apiClient.get(`api/admin/playlists/${id}`)
}

export const deleteAdminPlaylist = (id) => {
    return apiClient.delete(`api/admin/playlists/${id}`)
}

export const removeAdminPlaylistSong = (playlistId, songId) => {
    return apiClient.delete(`api/admin/playlists/${playlistId}/songs/${songId}`)
}
