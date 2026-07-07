<template>
  <div class="admin-playlists">
    <div class="page-header">
      <h1 class="page-title">歌单管理</h1>
    </div>

    <div class="toolbar">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="search"
          placeholder="搜索歌单名"
          @keyup.enter="loadPlaylists(1)"
        />
      </IconField>
      <Button label="搜索" severity="secondary" @click="loadPlaylists(1)" />
    </div>

    <DataTable
      :value="playlists"
      :loading="loading"
      lazy
      paginator
      :rows="pageSize"
      :totalRecords="total"
      :first="(page - 1) * pageSize"
      @page="onPage"
      dataKey="id"
      class="playlists-table"
    >
      <template #empty>暂无歌单</template>

      <Column field="id" header="ID" style="width: 70px" />
      <Column field="name" header="歌单名">
        <template #body="{ data }">
          <span class="playlist-cell">
            <img v-if="data.cover" :src="data.cover" class="playlist-cover" alt="" />
            <span v-else class="playlist-cover playlist-cover-empty"><i class="pi pi-image"></i></span>
            {{ data.name }}
          </span>
        </template>
      </Column>
      <Column field="owner" header="创建者" style="width: 140px" />
      <Column field="song_count" header="歌曲数" style="width: 100px">
        <template #body="{ data }">
          <Tag :value="String(data.song_count)" severity="info" />
        </template>
      </Column>
      <Column field="created_at" header="创建时间" style="width: 170px">
        <template #body="{ data }">{{ formatDate(data.created_at) }}</template>
      </Column>
      <Column header="操作" style="width: 170px">
        <template #body="{ data }">
          <Button
            icon="pi pi-eye"
            severity="secondary"
            text
            rounded
            v-tooltip.top="'查看歌曲'"
            @click="openDetail(data)"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            v-tooltip.top="'删除歌单'"
            @click="confirmDeletePlaylist(data)"
          />
        </template>
      </Column>
    </DataTable>

    <!-- 歌单详情弹窗 -->
    <Dialog
      v-model:visible="detailDialog"
      modal
      :header="detail ? `${detail.name}（${detail.owner}）` : '歌单详情'"
      :style="{ width: '640px', maxWidth: '95vw' }"
      :draggable="false"
    >
      <DataTable :value="detail?.songs || []" :loading="detailLoading" scrollable scrollHeight="420px" dataKey="id">
        <template #empty>歌单为空</template>
        <Column field="song_name" header="歌曲">
          <template #body="{ data }">
            <span class="playlist-cell">
              <img v-if="data.cover" :src="data.cover" class="playlist-cover" alt="" />
              {{ data.song_name || data.song_id }}
            </span>
          </template>
        </Column>
        <Column field="artist" header="歌手" style="width: 140px" />
        <Column field="album" header="专辑" style="width: 140px" />
        <Column header="" style="width: 60px">
          <template #body="{ data }">
            <Button
              icon="pi pi-times"
              severity="danger"
              text
              rounded
              v-tooltip.top="'移除歌曲'"
              @click="confirmRemoveSong(data)"
            />
          </template>
        </Column>
      </DataTable>
    </Dialog>
  </div>
</template>

<script>
import dayjs from 'dayjs'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Tooltip from 'primevue/tooltip'
import { getAdminPlaylists, getAdminPlaylistDetail, deleteAdminPlaylist, removeAdminPlaylistSong } from '../../api/adminApi'

export default {
  name: 'AdminPlaylists',
  components: {
    Button,
    InputText,
    IconField,
    InputIcon,
    DataTable,
    Column,
    Tag,
    Dialog
  },
  directives: {
    tooltip: Tooltip
  },
  data() {
    return {
      playlists: [],
      total: 0,
      page: 1,
      pageSize: 10,
      search: '',
      loading: false,
      // 详情
      detailDialog: false,
      detail: null,
      detailLoading: false
    }
  },
  created() {
    this.loadPlaylists()
  },
  methods: {
    formatDate(d) {
      return dayjs(d).format('YYYY-MM-DD HH:mm')
    },
    async loadPlaylists(page) {
      if (page) this.page = page
      this.loading = true
      try {
        const res = await getAdminPlaylists({ page: this.page, pageSize: this.pageSize, search: this.search })
        if (res.data.code === 200) {
          this.playlists = res.data.data.list.map(p => ({
            ...p,
            song_count: parseInt(p.song_count, 10)
          }))
          this.total = res.data.data.total
        }
      } catch (err) {
        this.toastError(err, '加载歌单列表失败')
      } finally {
        this.loading = false
      }
    },
    onPage(event) {
      this.page = event.page + 1
      this.pageSize = event.rows
      this.loadPlaylists()
    },
    // ---------- 详情 ----------
    async openDetail(playlist) {
      this.detail = { ...playlist, songs: [] }
      this.detailDialog = true
      this.detailLoading = true
      try {
        const res = await getAdminPlaylistDetail(playlist.id)
        if (res.data.code === 200) {
          this.detail = res.data.data
        }
      } catch (err) {
        this.toastError(err, '加载歌单详情失败')
      } finally {
        this.detailLoading = false
      }
    },
    // ---------- 删除歌单 ----------
    confirmDeletePlaylist(playlist) {
      this.$confirm.require({
        message: `确定删除歌单「${playlist.name}」（创建者：${playlist.owner}，共 ${playlist.song_count} 首歌）吗？此操作不可恢复。`,
        header: '删除歌单',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: '取消', severity: 'secondary', outlined: true },
        acceptProps: { label: '删除', severity: 'danger' },
        accept: async () => {
          try {
            await deleteAdminPlaylist(playlist.id)
            this.$toast.add({ severity: 'success', summary: '删除成功', detail: `歌单「${playlist.name}」已删除`, life: 3000 })
            if (this.playlists.length === 1 && this.page > 1) this.page -= 1
            this.loadPlaylists()
          } catch (err) {
            this.toastError(err, '删除失败')
          }
        }
      })
    },
    // ---------- 移除歌曲 ----------
    confirmRemoveSong(song) {
      this.$confirm.require({
        message: `确定从歌单中移除「${song.song_name || song.song_id}」吗？`,
        header: '移除歌曲',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: '取消', severity: 'secondary', outlined: true },
        acceptProps: { label: '移除', severity: 'danger' },
        accept: async () => {
          try {
            await removeAdminPlaylistSong(this.detail.id, song.song_id)
            this.detail.songs = this.detail.songs.filter(s => s.song_id !== song.song_id)
            this.$toast.add({ severity: 'success', summary: '移除成功', detail: `已移除「${song.song_name || song.song_id}」`, life: 3000 })
            this.loadPlaylists()
          } catch (err) {
            this.toastError(err, '移除失败')
          }
        }
      })
    },
    toastError(err, fallback) {
      this.$toast.add({ severity: 'error', summary: '出错了', detail: err.response?.data?.msg || fallback, life: 4000 })
    }
  }
}
</script>

<style lang="scss" scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.playlists-table {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--p-content-border-color);
}

.playlist-cell {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.playlist-cover {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.playlist-cover-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--p-content-hover-background);
  color: var(--p-text-muted-color);
}
</style>
