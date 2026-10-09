<script setup lang="ts">
import { storeToRefs } from 'pinia'
const store = useAccountsStore()
const { accounts, loading, error } = storeToRefs(store)
const search = ref('')
const filteredAccounts = computed(() => accounts.value.filter(account => `${account.name} ${account.subdomain}`.toLowerCase().includes(search.value.toLowerCase())))
onMounted(() => store.index().catch(() => {}))
</script>

<template>
  <section class="page-header mb-8"><div><div class="text-overline text-primary font-weight-bold">WORKSPACE</div><h1 class="text-h4 font-weight-bold mt-1">Accounts</h1><p class="text-body-1 text-medium-emphasis mt-2">Manage tenant accounts and subdomains.</p></div><VBtn color="primary" prepend-icon="mdi-domain-plus" to="/accounts/create">Create account</VBtn></section>
  <VCard rounded="xl" variant="flat"><VProgressLinear v-if="loading" color="primary" indeterminate /><VCardItem class="pa-6 pb-3"><template #title>All accounts</template><template #subtitle>{{ filteredAccounts.length }} accounts</template></VCardItem><VCardText class="pa-6 pt-2"><VAlert v-if="error" class="mb-5" color="error" variant="tonal">{{ error }}</VAlert><VTextField v-model="search" class="mb-5" hide-details label="Search accounts" prepend-inner-icon="mdi-magnify" rounded="lg" variant="solo-filled" /><VTable><thead><tr><th>Name</th><th>Subdomain</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody><tr v-for="account in filteredAccounts" :key="account.id"><td>{{ account.name }}</td><td>{{ account.subdomain }}</td><td><VChip :color="account.disabled ? 'error' : 'success'" size="small" variant="tonal">{{ account.disabled ? 'Disabled' : 'Active' }}</VChip></td><td><VBtn :to="`/accounts/${account.id}/edit`" aria-label="Edit account" icon="mdi-pencil-outline" size="small" variant="text" /></td></tr></tbody></VTable><div v-if="!filteredAccounts.length" class="text-center py-12 text-medium-emphasis">No accounts found.</div></VCardText></VCard>
</template>

<style scoped>.page-header { align-items: flex-end; display: flex; justify-content: space-between; } @media (max-width: 600px) { .page-header { align-items: flex-start; flex-direction: column; gap: 20px; } }</style>
