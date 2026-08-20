<script setup lang="ts">
const drawer = ref(true)

const primaryNavigation = [
  { title: 'Overview', icon: 'mdi-view-dashboard-outline', to: '/' },
  { title: 'Users', icon: 'mdi-account-group-outline', to: '/users' },
  { title: 'Courses', icon: 'mdi-book-open-page-variant-outline', to: '/courses' },
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

    <SessionAccountMenu />
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
.dashboard-main {
  background: #f6f8fc;
  min-height: 100vh;
}
.dashboard-container {
  margin-inline: auto;
  max-width: 1600px;
}
</style>
