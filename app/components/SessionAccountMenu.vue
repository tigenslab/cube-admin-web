<script setup lang="ts">
const session = useSessionStore()

const displayName = computed(() => (
  session.user?.name
  || session.user?.username
  || session.userUsername
  || session.username
  || 'Signed in user'
))
const displayEmail = computed(() => session.user?.email ?? '')
const initials = computed(() => {
  const parts = displayName.value.trim().split(/\s+/).filter(Boolean)

  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U'
})

async function logout() {
  try {
    await session.logout()
  } catch {
    // Local session data is cleared even if the remote session has expired.
  } finally {
    await navigateTo('/sessions/login')
  }
}
</script>

<template>
  <VMenu>
    <template #activator="{ props }">
      <VBtn class="account-button" v-bind="props" variant="text">
        <VAvatar color="primary" size="36">
          <span class="text-caption font-weight-bold">{{ initials }}</span>
        </VAvatar>
        <div class="text-left d-none d-sm-block ml-3">
          <div class="text-body-2 font-weight-medium">{{ displayName }}</div>
          <div v-if="displayEmail" class="text-caption text-medium-emphasis">{{ displayEmail }}</div>
        </div>
        <VIcon class="ml-2 d-none d-sm-flex" icon="mdi-chevron-down" />
      </VBtn>
    </template>

    <VList min-width="200">
      <VListItem prepend-icon="mdi-account-outline" title="My profile" to="/profile" />
      <VListItem prepend-icon="mdi-cog-outline" title="Preferences" />
      <VDivider />
      <VListItem base-color="error" prepend-icon="mdi-logout" title="Sign out" @click="logout" />
    </VList>
  </VMenu>
</template>

<style scoped>
.account-button {
  height: 52px !important;
  text-transform: none;
}
</style>
