<template>
  <div class="dashboard">
    <h1 class="page-title">仪表盘</h1>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div v-for="card in statCards" :key="card.label" class="stat-card">
        <div class="stat-icon" :style="{ background: card.bg, color: card.color }">
          <i :class="card.icon"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ card.value }}</span>
          <span class="stat-label">{{ card.label }}</span>
        </div>
      </div>
    </div>

    <div class="panel-grid">
      <!-- 30天新增趋势 -->
      <div class="panel">
        <h2 class="panel-title"><i class="pi pi-chart-line"></i> 近30天新增</h2>
        <div v-if="trendDays.length" class="trend">
          <div class="trend-legend">
            <span><i class="dot dot-user"></i>用户</span>
            <span><i class="dot dot-playlist"></i>歌单</span>
          </div>
          <div class="trend-bars">
            <div
              v-for="day in trendDays"
              :key="day.date"
              class="trend-day"
              v-tooltip.top="`${day.date}：用户 +${day.users}，歌单 +${day.playlists}`"
            >
              <div class="bar-stack">
                <div class="bar bar-user" :style="{ height: barHeight(day.users) }"></div>
                <div class="bar bar-playlist" :style="{ height: barHeight(day.playlists) }"></div>
              </div>
              <span class="trend-date">{{ day.date.slice(5) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="empty-hint">近30天暂无新增数据</p>
      </div>

      <!-- 最新注册 -->
      <div class="panel">
        <h2 class="panel-title"><i class="pi pi-user-plus"></i> 最新注册</h2>
        <ul v-if="stats.recent_users.length" class="simple-list">
          <li v-for="u in stats.recent_users" :key="u.id">
            <Avatar :label="u.username.charAt(0).toUpperCase()" shape="circle" size="small" />
            <span class="list-main">{{ u.username }}</span>
            <Tag v-if="u.is_admin" value="管理员" severity="warn" />
            <span class="list-sub">{{ formatDate(u.created_at) }}</span>
          </li>
        </ul>
        <p v-else class="empty-hint">暂无用户</p>
      </div>

      <!-- 热门歌曲 -->
      <div class="panel">
        <h2 class="panel-title"><i class="pi pi-star"></i> 热门歌曲（被收藏次数）</h2>
        <ul v-if="stats.top_songs.length" class="simple-list">
          <li v-for="(s, i) in stats.top_songs" :key="s.song_id">
            <span class="rank" :class="{ 'rank-top': i < 3 }">{{ i + 1 }}</span>
            <span class="list-main">{{ s.song_name || s.song_id }}</span>
            <span class="list-sub">{{ s.artist }}</span>
            <Tag :value="`${s.count} 次`" severity="info" />
          </li>
        </ul>
        <p v-else class="empty-hint">暂无收藏数据</p>
      </div>

      <!-- 热门歌手 -->
      <div class="panel">
        <h2 class="panel-title"><i class="pi pi-microphone"></i> 热门歌手</h2>
        <ul v-if="stats.top_artists.length" class="simple-list">
          <li v-for="(a, i) in stats.top_artists" :key="a.artist">
            <span class="rank" :class="{ 'rank-top': i < 3 }">{{ i + 1 }}</span>
            <span class="list-main">{{ a.artist }}</span>
            <Tag :value="`${a.count} 首`" severity="info" />
          </li>
        </ul>
        <p v-else class="empty-hint">暂无收藏数据</p>
      </div>
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'
import Avatar from 'primevue/avatar'
import Tag from 'primevue/tag'
import Tooltip from 'primevue/tooltip'
import { getAdminStats } from '../../api/adminApi'

export default {
  name: 'AdminDashboard',
  components: {
    Avatar,
    Tag
  },
  directives: {
    tooltip: Tooltip
  },
  data() {
    return {
      stats: {
        counts: { user_count: 0, playlist_count: 0, song_count: 0, admin_count: 0 },
        user_trend: [],
        playlist_trend: [],
        top_songs: [],
        top_artists: [],
        recent_users: []
      }
    }
  },
  computed: {
    statCards() {
      const c = this.stats.counts
      return [
        { label: '用户总数', value: c.user_count, icon: 'pi pi-users', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
        { label: '歌单总数', value: c.playlist_count, icon: 'pi pi-list', bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
        { label: '收藏歌曲', value: c.song_count, icon: 'pi pi-heart', bg: 'rgba(244,63,94,0.12)', color: '#f43f5e' },
        { label: '管理员', value: c.admin_count, icon: 'pi pi-shield', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' }
      ]
    },
    // 合并用户/歌单两条趋势为按天的数组
    trendDays() {
      const map = {}
      for (const row of this.stats.user_trend) {
        const d = dayjs(row.date).format('YYYY-MM-DD')
        map[d] = map[d] || { date: d, users: 0, playlists: 0 }
        map[d].users += parseInt(row.count, 10)
      }
      for (const row of this.stats.playlist_trend) {
        const d = dayjs(row.date).format('YYYY-MM-DD')
        map[d] = map[d] || { date: d, users: 0, playlists: 0 }
        map[d].playlists += parseInt(row.count, 10)
      }
      return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
    },
    trendMax() {
      let max = 1
      for (const day of this.trendDays) {
        max = Math.max(max, day.users, day.playlists)
      }
      return max
    }
  },
  async created() {
    try {
      const res = await getAdminStats()
      if (res.data.code === 200) {
        this.stats = res.data.data
      }
    } catch (err) {
      this.$toast.add({ severity: 'error', summary: '加载失败', detail: err.response?.data?.msg || '无法获取统计数据', life: 4000 })
    }
  },
  methods: {
    formatDate(d) {
      return dayjs(d).format('YYYY-MM-DD')
    },
    barHeight(value) {
      if (!value) return '2px'
      return `${Math.max((value / this.trendMax) * 72, 6)}px`
    }
  }
}
</script>

<style lang="scss" scoped>
.page-title {
  margin: 0 0 22px;
  font-size: 24px;
  font-weight: 700;
}

/* ---------- 统计卡片 ---------- */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 12px;
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
}

.stat-icon {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  i {
    font-size: 20px;
  }
}

.stat-info {
  display: flex;
  flex-direction: column;

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    line-height: 1.2;
  }

  .stat-label {
    font-size: 13px;
    color: var(--p-text-muted-color);
  }
}

/* ---------- 面板 ---------- */
.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 16px;
}

.panel {
  padding: 20px;
  border-radius: 12px;
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
}

.panel-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    color: var(--p-primary-color);
  }
}

.empty-hint {
  margin: 8px 0;
  color: var(--p-text-muted-color);
  font-size: 14px;
}

/* ---------- 趋势图 ---------- */
.trend-legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--p-text-muted-color);
  margin-bottom: 10px;

  span {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    display: inline-block;
  }

  .dot-user { background: #3b82f6; }
  .dot-playlist { background: #10b981; }
}

.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.trend-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 34px;
}

.bar-stack {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 76px;
}

.bar {
  width: 10px;
  border-radius: 3px 3px 0 0;

  &.bar-user { background: #3b82f6; }
  &.bar-playlist { background: #10b981; }
}

.trend-date {
  font-size: 11px;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

/* ---------- 简单列表 ---------- */
.simple-list {
  list-style: none;
  margin: 0;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid var(--p-content-border-color);
    font-size: 14px;

    &:last-child {
      border-bottom: none;
    }
  }

  .list-main {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }

  .list-sub {
    color: var(--p-text-muted-color);
    font-size: 12.5px;
    flex-shrink: 0;
  }
}

.rank {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: var(--p-content-hover-background);
  color: var(--p-text-muted-color);
  flex-shrink: 0;

  &.rank-top {
    background: var(--p-primary-color);
    color: var(--p-primary-contrast-color);
  }
}
</style>
