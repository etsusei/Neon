/**
 * 网易云图片 CDN 缩略图工具。
 * p1.music.126.net 等图床支持 `?param=宽y高` 返回缩略图，
 * 列表小图用缩略图可把单张几百 KB 的原图压到几 KB。
 *
 * 非网易云域名的 URL（如自建库里存的第三方图）原样返回，不做处理。
 */
export function thumb(url, size = 200) {
  if (!url || typeof url !== 'string') return url || ''
  if (!/music\.126\.net/.test(url)) return url
  if (url.includes('param=')) return url
  // 顺手把 http 升级成 https，避免混合内容告警
  const secure = url.replace(/^http:\/\//, 'https://')
  const sep = secure.includes('?') ? '&' : '?'
  return `${secure}${sep}param=${size}y${size}`
}
