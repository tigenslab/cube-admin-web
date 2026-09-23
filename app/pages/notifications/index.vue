<script setup lang="ts">
const store = useNotificationsStore()
onMounted(() => store.search())
async function remove(id: string) { if (confirm('Delete this notification?')) await store.remove(id) }
</script>
<template>
  <section class="page-header mb-8"><div><h1 class="text-h4 font-weight-bold">Notifications</h1><p class="text-body-1 text-medium-emphasis mt-2">Manage account notifications.</p></div><VBtn color="primary" to="/notifications/create">Create notification</VBtn></section>
  <VAlert v-if="store.error" class="mb-4" color="error">{{ store.error }}</VAlert>
  <VCard rounded="xl" variant="flat"><VTable><thead><tr><th>User</th><th>Type</th><th>Status</th><th>Message</th><th>Created</th><th /></tr></thead><tbody><tr v-for="item in store.notifications" :key="item.id"><td>{{ item.user_id }}</td><td><VChip size="small">{{ item.type }}</VChip></td><td><VChip size="small" :color="item.status === 'success' ? 'success' : item.status === 'failed' ? 'error' : undefined">{{ item.status || 'pending' }}</VChip></td><td>{{ String(item.message.title ?? item.message.body ?? '') }}</td><td>{{ item.created_at }}</td><td><VBtn icon="mdi-delete-outline" size="small" variant="text" @click="remove(item.id)" /></td></tr></tbody></VTable></VCard>
</template>
