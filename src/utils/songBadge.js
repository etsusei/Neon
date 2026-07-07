// 歌曲权益标记
// fee=1: VIP 专属（非会员只能试听）；privilege.st<0: 不可播（无版权/下架/地区限制）
// 兼容两种数据形状：song/detail 的 fee/privilege，老搜索接口的顶层 fee/st

export const isVipSong = (track) => {
  if (!track) return false
  return track.fee === 1 || (track.privilege && track.privilege.fee === 1)
}

export const isUnavailableSong = (track) => {
  if (!track) return false
  const st = track.privilege ? track.privilege.st : track.st
  return typeof st === 'number' && st < 0
}
