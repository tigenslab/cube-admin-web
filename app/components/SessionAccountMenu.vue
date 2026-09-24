<script setup lang="ts">
const session = useSessionStore()

const displayName = computed(() => {
  const firstName = session.user?.first_name?.trim()
  const lastName = session.user?.last_name?.trim()
  if (firstName && lastName) return `${firstName.charAt(0)}. ${lastName}`
  return firstName || session.user?.name || session.user?.username || session.userUsername || session.username || 'Signed in user'
})
const currentRoleLabel = computed(() => (session.currentRole || 'No role').replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase()))
const roleOptions = computed(() => session.roles.map(role => ({
  title: role.replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase()),
  value: role
})))
const roleError = ref('')
const changingRole = ref(false)

async function changeRole(role: string) {
  if (!role || role === session.currentRole) return
  changingRole.value = true
  roleError.value = ''
  try {
    await session.changeRole(role)
    await navigateTo('/')
  } catch (cause) {
    roleError.value = getApiErrorMessage(cause, 'Unable to change role.')
  } finally {
    changingRole.value = false
  }
}
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
          <div class="text-caption text-medium-emphasis">{{ currentRoleLabel }}</div>
        </div>
        <VIcon class="ml-2 d-none d-sm-flex" icon="mdi-chevron-down" />
      </VBtn>
    </template>

    <VList min-width="240">
      <VListSubheader>Switch role</VListSubheader>
      <VListItem
        v-for="role in roleOptions"
        :key="role.value"
        :active="session.currentRole === role.value"
        :disabled="changingRole"
        :title="role.title"
        rounded="lg"
        @click="changeRole(role.value)"
      >
        <template #append>
          <VRadio
            :model-value="session.currentRole"
            :value="role.value"
            color="primary"
            density="compact"
            hide-details
            tabindex="-1"
          />
        </template>
      </VListItem>
      <VProgressLinear v-if="changingRole" class="mx-4" color="primary" indeterminate />
      <VAlert v-if="roleError" class="mx-4 my-2" density="compact" type="error">{{ roleError }}</VAlert>
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
