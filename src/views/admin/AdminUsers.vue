<template>
  <div class="admin-users">
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
      <Button label="新建用户" icon="pi pi-plus" @click="openCreateDialog" />
    </div>

    <div class="toolbar">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="search"
          placeholder="搜索用户名"
          @keyup.enter="loadUsers(1)"
        />
      </IconField>
      <Button label="搜索" severity="secondary" @click="loadUsers(1)" />
    </div>

    <DataTable
      :value="users"
      :loading="loading"
      lazy
      paginator
      :rows="pageSize"
      :totalRecords="total"
      :first="(page - 1) * pageSize"
      @page="onPage"
      dataKey="id"
      class="users-table"
    >
      <template #empty>暂无用户</template>

      <Column field="id" header="ID" style="width: 70px" />
      <Column field="username" header="用户名">
        <template #body="{ data }">
          <span class="username-cell">
            {{ data.username }}
            <Tag v-if="data.id === currentUserId" value="我" severity="success" />
          </span>
        </template>
      </Column>
      <Column field="is_admin" header="管理员" style="width: 110px">
        <template #body="{ data }">
          <ToggleSwitch
            :modelValue="data.is_admin"
            @update:modelValue="toggleAdmin(data, $event)"
          />
        </template>
      </Column>
      <Column field="playlist_count" header="歌单数" style="width: 100px">
        <template #body="{ data }">
          <Tag :value="String(data.playlist_count)" severity="info" />
        </template>
      </Column>
      <Column field="created_at" header="注册时间" style="width: 170px">
        <template #body="{ data }">{{ formatDate(data.created_at) }}</template>
      </Column>
      <Column header="操作" style="width: 170px">
        <template #body="{ data }">
          <Button
            icon="pi pi-key"
            severity="secondary"
            text
            rounded
            v-tooltip.top="'重置密码'"
            @click="openResetDialog(data)"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            :disabled="data.id === currentUserId || data.is_admin"
            v-tooltip.top="data.is_admin ? '请先解除管理员权限再删除' : '删除用户'"
            @click="confirmDelete(data)"
          />
        </template>
      </Column>
    </DataTable>

    <!-- 新建用户弹窗 -->
    <Dialog
      v-model:visible="createDialog"
      modal
      header="新建用户"
      :style="{ width: '380px' }"
      :draggable="false"
    >
      <form @submit.prevent="handleCreate" class="dialog-form">
        <div class="dialog-field">
          <label>用户名</label>
          <InputText v-model="createForm.username" maxlength="50" fluid autofocus />
        </div>
        <div class="dialog-field">
          <label>密码（至少6位）</label>
          <Password v-model="createForm.password" :feedback="false" toggle-mask fluid />
        </div>
        <div class="dialog-field-inline">
          <label>设为管理员</label>
          <ToggleSwitch v-model="createForm.is_admin" />
        </div>
        <Message v-if="createError" severity="error" :closable="false">{{ createError }}</Message>
        <Button type="submit" label="创建" icon="pi pi-check" :loading="createLoading" fluid />
      </form>
    </Dialog>

    <!-- 重置密码弹窗 -->
    <Dialog
      v-model:visible="resetDialog"
      modal
      :header="`重置密码：${resetTarget?.username || ''}`"
      :style="{ width: '380px' }"
      :draggable="false"
    >
      <form @submit.prevent="handleReset" class="dialog-form">
        <div class="dialog-field">
          <label>新密码（至少6位）</label>
          <Password v-model="resetPassword" :feedback="false" toggle-mask fluid autofocus />
        </div>
        <Message v-if="resetError" severity="error" :closable="false">{{ resetError }}</Message>
        <Button type="submit" label="确认重置" icon="pi pi-check" :loading="resetLoading" fluid />
      </form>
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
import ToggleSwitch from 'primevue/toggleswitch'
import Dialog from 'primevue/dialog'
import Password from 'primevue/password'
import Message from 'primevue/message'
import Tooltip from 'primevue/tooltip'
import { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from '../../api/adminApi'

export default {
  name: 'AdminUsers',
  components: {
    Button,
    InputText,
    IconField,
    InputIcon,
    DataTable,
    Column,
    Tag,
    ToggleSwitch,
    Dialog,
    Password,
    Message
  },
  directives: {
    tooltip: Tooltip
  },
  data() {
    return {
      users: [],
      total: 0,
      page: 1,
      pageSize: 10,
      search: '',
      loading: false,
      // 新建
      createDialog: false,
      createForm: { username: '', password: '', is_admin: false },
      createLoading: false,
      createError: '',
      // 重置密码
      resetDialog: false,
      resetTarget: null,
      resetPassword: '',
      resetLoading: false,
      resetError: ''
    }
  },
  computed: {
    currentUserId() {
      try {
        return JSON.parse(localStorage.getItem('user_info') || '{}').id
      } catch (e) {
        return null
      }
    }
  },
  created() {
    this.loadUsers()
  },
  methods: {
    formatDate(d) {
      return dayjs(d).format('YYYY-MM-DD HH:mm')
    },
    async loadUsers(page) {
      if (page) this.page = page
      this.loading = true
      try {
        const res = await getAdminUsers({ page: this.page, pageSize: this.pageSize, search: this.search })
        if (res.data.code === 200) {
          this.users = res.data.data.list.map(u => ({
            ...u,
            playlist_count: parseInt(u.playlist_count, 10)
          }))
          this.total = res.data.data.total
        }
      } catch (err) {
        this.toastError(err, '加载用户列表失败')
      } finally {
        this.loading = false
      }
    },
    onPage(event) {
      this.page = event.page + 1
      this.pageSize = event.rows
      this.loadUsers()
    },
    // ---------- 新建 ----------
    openCreateDialog() {
      this.createForm = { username: '', password: '', is_admin: false }
      this.createError = ''
      this.createDialog = true
    },
    async handleCreate() {
      const { username, password } = this.createForm
      if (!username || !password) {
        this.createError = '用户名和密码不能为空'
        return
      }
      if (password.length < 6) {
        this.createError = '密码至少6个字符'
        return
      }
      this.createLoading = true
      try {
        await createAdminUser(this.createForm)
        this.createDialog = false
        this.$toast.add({ severity: 'success', summary: '创建成功', detail: `用户 ${username} 已创建`, life: 3000 })
        this.loadUsers()
      } catch (err) {
        this.createError = err.response?.data?.msg || '创建失败'
      } finally {
        this.createLoading = false
      }
    },
    // ---------- 管理员开关 ----------
    async toggleAdmin(user, value) {
      try {
        await updateAdminUser(user.id, { is_admin: value })
        user.is_admin = value
        this.$toast.add({
          severity: 'success',
          summary: '更新成功',
          detail: `${user.username} ${value ? '已设为管理员' : '已取消管理员'}`,
          life: 3000
        })
      } catch (err) {
        this.toastError(err, '更新失败')
      }
    },
    // ---------- 重置密码 ----------
    openResetDialog(user) {
      this.resetTarget = user
      this.resetPassword = ''
      this.resetError = ''
      this.resetDialog = true
    },
    async handleReset() {
      if (!this.resetPassword || this.resetPassword.length < 6) {
        this.resetError = '密码至少6个字符'
        return
      }
      this.resetLoading = true
      try {
        await updateAdminUser(this.resetTarget.id, { password: this.resetPassword })
        this.resetDialog = false
        this.$toast.add({ severity: 'success', summary: '重置成功', detail: `${this.resetTarget.username} 的密码已重置`, life: 3000 })
      } catch (err) {
        this.resetError = err.response?.data?.msg || '重置失败'
      } finally {
        this.resetLoading = false
      }
    },
    // ---------- 删除 ----------
    confirmDelete(user) {
      this.$confirm.require({
        message: `确定删除用户「${user.username}」吗？该用户的 ${user.playlist_count} 个歌单及其中歌曲会一并删除，此操作不可恢复。`,
        header: '删除用户',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: '取消', severity: 'secondary', outlined: true },
        acceptProps: { label: '删除', severity: 'danger' },
        accept: async () => {
          try {
            await deleteAdminUser(user.id)
            this.$toast.add({ severity: 'success', summary: '删除成功', detail: `用户 ${user.username} 已删除`, life: 3000 })
            // 若当前页删空则回退一页
            if (this.users.length === 1 && this.page > 1) this.page -= 1
            this.loadUsers()
          } catch (err) {
            this.toastError(err, '删除失败')
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

.users-table {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--p-content-border-color);
}

.username-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 4px;
}

.dialog-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 13px;
    font-weight: 600;
  }
}

.dialog-field-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;

  label {
    font-size: 13px;
    font-weight: 600;
  }
}
</style>
