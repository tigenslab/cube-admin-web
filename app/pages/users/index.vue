<script setup lang="ts">
import { storeToRefs } from 'pinia'

type UserStatus = 'Active' | 'Invited' | 'Suspended'

const usersStore = useUsersStore()
const { users, loading, error } = storeToRefs(usersStore)
const search = ref('')
const status = ref<'All' | UserStatus>('All')

onMounted(() => {
  usersStore.index().catch(() => {
    // The store exposes request failures through error.
  })
})

const displayUsers = computed(() => users.value.map((user) => {
  const name = user.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Unnamed user'
  const normalizedStatus = user.status?.toLowerCase()
  const userStatus: UserStatus = normalizedStatus === 'invited'
    ? 'Invited'
    : normalizedStatus === 'suspended' || user.is_active === false || user.enabled === false
      ? 'Suspended'
      : 'Active'

  return {
    ...user,
    name,
    email: user.email || user.username || '—',
    role: user.role || user.user_type || 'User',
    team: user.team || '—',
    status: userStatus,
    initials: name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(),
    color: userStatus === 'Active' ? 'primary' : userStatus === 'Invited' ? 'warning' : 'error',
    lastActive: user.last_active || user.updated_at || '—'
  }
}))

const filteredUsers = computed(() => displayUsers.value.filter((user) => {
  const matchesSearch = `${user.name} ${user.email} ${user.role} ${user.team}`.toLowerCase().includes(search.value.toLowerCase())
  const matchesStatus = status.value === 'All' || user.status === status.value
  return matchesSearch && matchesStatus
}))

const activeUsers = computed(() => displayUsers.value.filter(user => user.status === 'Active').length)
const invitedUsers = computed(() => displayUsers.value.filter(user => user.status === 'Invited').length)

const statusColor: Record<UserStatus, string> = {
  Active: 'success',
  Invited: 'warning',
  Suspended: 'error'
}
</script>

<template>
  <section class="page-header mb-8">
    <div>
      <div class="text-overline text-primary font-weight-bold">WORKSPACE</div>
      <h1 class="text-h4 font-weight-bold mt-1">Users</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">Manage access, roles, and invitations for your team.</p>
    </div>
    <VBtn color="primary" prepend-icon="mdi-account-plus" to="/users/create">Invite user</VBtn>
  </section>

  <VRow class="mb-4">
    <VCol cols="12" md="4">
      <VCard rounded="xl" variant="flat">
        <VCardText class="d-flex align-center ga-4 pa-5">
          <VAvatar color="primary" rounded="lg" variant="tonal"><VIcon icon="mdi-account-group-outline" /></VAvatar>
          <div><div class="text-h5 font-weight-bold">{{ users.length }}</div><div class="text-body-2 text-medium-emphasis">Total users</div></div>
        </VCardText>
      </VCard>
    </VCol>
    <VCol cols="12" md="4">
      <VCard rounded="xl" variant="flat">
        <VCardText class="d-flex align-center ga-4 pa-5">
          <VAvatar color="success" rounded="lg" variant="tonal"><VIcon icon="mdi-account-check-outline" /></VAvatar>
          <div><div class="text-h5 font-weight-bold">{{ activeUsers }}</div><div class="text-body-2 text-medium-emphasis">Active users</div></div>
        </VCardText>
      </VCard>
    </VCol>
    <VCol cols="12" md="4">
      <VCard rounded="xl" variant="flat">
        <VCardText class="d-flex align-center ga-4 pa-5">
          <VAvatar color="warning" rounded="lg" variant="tonal"><VIcon icon="mdi-email-outline" /></VAvatar>
          <div><div class="text-h5 font-weight-bold">{{ invitedUsers }}</div><div class="text-body-2 text-medium-emphasis">Pending invitations</div></div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <VCard rounded="xl" variant="flat">
    <VProgressLinear v-if="loading" color="primary" indeterminate />
    <VCardItem class="pa-6 pb-3">
      <template #title>All users</template>
      <template #subtitle>{{ filteredUsers.length }} people match your filters</template>
    </VCardItem>

    <VCardText class="pa-6 pt-2">
      <VAlert v-if="error" class="mb-5" color="error" density="compact" variant="tonal">
        {{ error }}
      </VAlert>
      <div class="filters mb-5">
        <VTextField
          v-model="search"
          density="comfortable"
          hide-details
          placeholder="Search name, email, or team"
          prepend-inner-icon="mdi-magnify"
          rounded="lg"
          variant="solo-filled"
        />
        <VSelect
          v-model="status"
          :items="['All', 'Active', 'Invited', 'Suspended']"
          density="comfortable"
          hide-details
          label="Status"
          rounded="lg"
          variant="solo-filled"
        />
      </div>

      <VTable class="users-table">
        <thead>
          <tr>
            <th>User</th>
            <th class="d-none d-md-table-cell">Role</th>
            <th class="d-none d-lg-table-cell">Team</th>
            <th>Status</th>
            <th class="d-none d-md-table-cell">Last active</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.id || user.email">
            <td>
              <div class="d-flex align-center ga-3 py-3">
                <VAvatar :color="user.color" size="40">{{ user.initials }}</VAvatar>
                <div>
                  <div class="text-body-2 font-weight-medium">{{ user.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ user.email }}</div>
                </div>
              </div>
            </td>
            <td class="d-none d-md-table-cell">{{ user.role }}</td>
            <td class="d-none d-lg-table-cell">{{ user.team }}</td>
            <td><VChip :color="statusColor[user.status]" size="small" variant="tonal">{{ user.status }}</VChip></td>
            <td class="d-none d-md-table-cell text-medium-emphasis">{{ user.lastActive }}</td>
            <td><VBtn :to="`/users/${user.id}/edit`" aria-label="Edit user" icon="mdi-pencil-outline" size="small" variant="text" /></td>
          </tr>
        </tbody>
      </VTable>

      <div v-if="filteredUsers.length === 0" class="text-center py-12">
        <VIcon color="medium-emphasis" icon="mdi-account-search-outline" size="48" />
        <div class="text-subtitle-1 font-weight-medium mt-3">No users found</div>
        <div class="text-body-2 text-medium-emphasis mt-1">Try a different search or status filter.</div>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
.page-header { align-items: flex-end; display: flex; justify-content: space-between; }
.filters { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr) 180px; }
.users-table th { color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }

@media (max-width: 600px) {
  .page-header { align-items: flex-start; flex-direction: column; gap: 20px; }
  .filters { grid-template-columns: 1fr; }
}
</style>
