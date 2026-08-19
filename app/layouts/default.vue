<script setup lang="ts">
const drawer = ref(true)

const primaryNavigation = [
  { title: 'Overview', icon: 'mdi-view-dashboard-outline', to: '/' },
  { title: 'Users', icon: 'mdi-account-group-outline', to: '/users' },
  { title: 'Content', icon: 'mdi-file-document-multiple-outline', to: '/content' },
  { title: 'Analytics', icon: 'mdi-chart-box-outline', to: '/analytics' },
]

const workspaceNavigation = [
  { title: 'Team', icon: 'mdi-account-cog-outline', to: '/team' },
  { title: 'Settings', icon: 'mdi-cog-outline', to: '/settings' },
]
</script>

<template>
  <VNavigationDrawer v-model="drawer" class="admin-drawer" color="surface" width="280">
    <div class="brand pa-6">
      <VAvatar color="primary" rounded="lg" size="42">
        <VIcon icon="mdi-cube-outline" />
      </VAvatar>
      <div>
        <div class="text-h6 font-weight-bold">Admin Console</div>
        <div class="text-caption text-medium-emphasis">Workspace management</div>
      </div>
    </div>

    <VDivider />

    <div class="pa-4">
      <VList density="comfortable" nav>
        <VListSubheader class="navigation-label">MAIN MENU</VListSubheader>
        <VListItem v-for="item in primaryNavigation" :key="item.title" :prepend-icon="item.icon" :title="item.title" :to="item.to" active-color="primary" rounded="lg" />

        <VListSubheader class="navigation-label mt-5">WORKSPACE</VListSubheader>
        <VListItem v-for="item in workspaceNavigation" :key="item.title" :prepend-icon="item.icon" :title="item.title" :to="item.to" active-color="primary" rounded="lg" />
      </VList>
    </div>

    <template #append>
      <div class="pa-4">
        <VSheet class="upgrade-card pa-4" color="primary" rounded="xl">
          <VIcon icon="mdi-rocket-launch-outline" />
          <div class="text-subtitle-2 font-weight-bold mt-3">Need more space?</div>
          <div class="text-caption mt-1">Unlock advanced controls for your team.</div>
          <VBtn class="mt-4" color="white" size="small" variant="flat">View plans</VBtn>
        </VSheet>
      </div>
    </template>
  </VNavigationDrawer>

  <VAppBar class="admin-app-bar" color="surface" elevation="0" height="72">
    <VAppBarNavIcon aria-label="Toggle navigation" @click="drawer = !drawer" />
    <VSpacer />
    <VTextField class="global-search d-none d-sm-flex" density="compact" hide-details placeholder="Search anything…" prepend-inner-icon="mdi-magnify" rounded="lg" variant="solo-filled" />
    <VBtn aria-label="Notifications" class="ml-2" icon variant="text">
      <VBadge color="error" dot>
        <VIcon icon="mdi-bell-outline" />
      </VBadge>
    </VBtn>
    <VDivider class="mx-3" vertical />

    <VMenu>
      <template #activator="{ props }">
        <VBtn class="account-button" v-bind="props" variant="text">
          <VAvatar color="primary" size="36">
            <span class="text-caption font-weight-bold">AD</span>
          </VAvatar>
          <div class="text-left d-none d-sm-block ml-3">
            <div class="text-body-2 font-weight-medium">Administrator</div>
            <div class="text-caption text-medium-emphasis">admin@example.com</div>
          </div>
          <VIcon class="ml-2 d-none d-sm-flex" icon="mdi-chevron-down" />
        </VBtn>
      </template>

      <VList min-width="200">
        <VListItem prepend-icon="mdi-account-outline" title="My profile" />
        <VListItem prepend-icon="mdi-cog-outline" title="Preferences" />
        <VDivider />
        <VListItem base-color="error" prepend-icon="mdi-logout" title="Sign out" />
      </VList>
    </VMenu>
  </VAppBar>

  <VMain class="dashboard-main">
    <VContainer class="dashboard-container pa-4 pa-md-8" fluid>
      <slot />
    </VContainer>
  </VMain>
</template>

<style scoped>
.brand {
  align-items: center;
  display: flex;
  gap: 12px;
  min-height: 96px;
}
.navigation-label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.upgrade-card {
  color: rgb(var(--v-theme-on-primary));
}
.admin-app-bar {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.global-search {
  max-width: 360px;
  width: 100%;
}
.account-button {
  height: 52px !important;
  text-transform: none;
}
.dashboard-main {
  background: #f6f8fc;
  min-height: 100vh;
}
.dashboard-container {
  margin-inline: auto;
  max-width: 1600px;
}
</style>
