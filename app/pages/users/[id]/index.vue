<script setup lang="ts">
const route = useRoute()
const users = useUsersStore()
const user = ref<Awaited<ReturnType<typeof users.show>> | null>(null)
const error = ref('')
onMounted(async () => {
  try { user.value = await users.show(String(route.params.id)) }
  catch (cause) { error.value = getApiErrorMessage(cause, 'Unable to load user.') }
})
</script>
<template>
  <VBtn class="mb-6" to="/users" variant="text">Back to users</VBtn>
  <VAlert v-if="error" class="mb-4" type="error">{{ error }}</VAlert>
  <VCard v-if="user" max-width="720" rounded="xl" variant="flat">
    <VCardItem><template #title>{{ user.first_name }} {{ user.last_name }}</template><template #subtitle>{{ user.email || user.username }}</template></VCardItem>
    <VCardText><div>Username: {{ user.username }}</div><div>Phone: {{ user.phone || '—' }}</div><div class="mt-3">Roles: {{ user.roles?.join(', ') || '—' }}</div></VCardText>
    <VCardActions v-if="user.permissions?.update"><VBtn :to="`/users/${user.id}/edit`" color="primary">Edit user</VBtn></VCardActions>
  </VCard>
</template>
