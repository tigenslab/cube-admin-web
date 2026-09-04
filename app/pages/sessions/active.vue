<script setup lang="ts">
interface ActiveSession { id: string; user_id?: string; username?: string; device_id?: string; ip_address?: string; request_json?: { device_information?: { user_agent?: string } }; created_at?: string; updated_at?: string }
const api = useApi()
const sessions = ref<ActiveSession[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try { sessions.value = await api<ActiveSession[]>('/sessions/active') }
  catch (cause) { error.value = getApiErrorMessage(cause, 'Unable to load active sessions.') }
  finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <section class="page-header mb-8"><div><div class="text-overline text-primary font-weight-bold">SECURITY</div><h1 class="text-h4 font-weight-bold mt-1">Active sessions</h1><p class="text-body-1 text-medium-emphasis mt-2">Sessions currently active in this account.</p></div><VBtn :loading="loading" prepend-icon="mdi-refresh" variant="tonal" @click="load">Refresh</VBtn></section>
  <VCard rounded="xl" variant="flat"><VProgressLinear v-if="loading" color="primary" indeterminate /><VAlert v-if="error" class="ma-6 mb-0" color="error" variant="tonal">{{ error }}</VAlert><VTable><thead><tr><th>User</th><th>Device</th><th>Browser</th><th>IP address</th><th>Last updated</th></tr></thead><tbody><tr v-for="session in sessions" :key="session.id"><td>{{ session.username || session.user_id || 'Unknown user' }}</td><td>{{ session.device_id || '—' }}</td><td>{{ session.request_json?.device_information?.user_agent || '—' }}</td><td>{{ session.ip_address || '—' }}</td><td>{{ session.updated_at || session.created_at || '—' }}</td></tr></tbody></VTable><div v-if="!loading && !error && sessions.length === 0" class="text-center py-12 text-medium-emphasis">No active sessions.</div></VCard>
</template>

<style scoped>
.page-header { align-items: flex-end; display: flex; justify-content: space-between; }
</style>
