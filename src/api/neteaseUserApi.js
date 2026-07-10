import { apiClient } from "./http"

// ========== 网易云扫码登录 ==========
// timestamp 参数用于绕过浏览器/CDN 层的 GET 缓存（后端已对 /login 路径关闭服务端缓存）

export const getQrKey = () => {
    return apiClient.get(`login/qr/key?timestamp=${Date.now()}`)
}

// 800: 二维码过期  801: 等待扫码  802: 已扫码待确认  803: 登录成功(返回 cookie)
export const checkQrStatus = (key) => {
    return apiClient.get(`login/qr/check?key=${encodeURIComponent(key)}&timestamp=${Date.now()}`)
}

// 用 cookie 换用户资料；未登录时 data.profile 为 null
export const getNeteaseLoginStatus = (cookie) => {
    return apiClient.get(`login/status?timestamp=${Date.now()}`, {
        headers: cookie ? { 'X-Netease-Cookie': encodeURIComponent(cookie) } : undefined
    })
}

// ========== 网易云歌单（需登录态，拦截器自动带 X-Netease-Cookie） ==========

export const getNeteaseUserPlaylists = (uid) => {
    return apiClient.get(`user/playlist?uid=${uid}&limit=200&timestamp=${Date.now()}`)
}

export const createNeteasePlaylist = (name) => {
    return apiClient.get(`playlist/create?name=${encodeURIComponent(name)}&timestamp=${Date.now()}`)
}

export const deleteNeteasePlaylist = (id) => {
    return apiClient.get(`playlist/delete?id=${id}&timestamp=${Date.now()}`)
}

// 取消收藏别人的歌单（自己创建的用 delete）
export const unsubscribeNeteasePlaylist = (id) => {
    return apiClient.get(`playlist/subscribe?t=2&id=${id}&timestamp=${Date.now()}`)
}

export const addTracksToNeteasePlaylist = (pid, trackIds) => {
    const tracks = Array.isArray(trackIds) ? trackIds.join(',') : trackIds
    return apiClient.get(`playlist/tracks?op=add&pid=${pid}&tracks=${tracks}&timestamp=${Date.now()}`)
}

export const removeTracksFromNeteasePlaylist = (pid, trackIds) => {
    const tracks = Array.isArray(trackIds) ? trackIds.join(',') : trackIds
    return apiClient.get(`playlist/tracks?op=del&pid=${pid}&tracks=${tracks}&timestamp=${Date.now()}`)
}

export const likeNeteaseSong = (id, like = true) => {
    return apiClient.get(`like?id=${id}&like=${like}&timestamp=${Date.now()}`)
}
