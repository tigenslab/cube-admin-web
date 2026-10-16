<template>
  <VNavigationDrawer permanent :width="390" class="unit-builder-sidebar">
    <slot name="sidebar" />
  </VNavigationDrawer>
  <VMain class="unit-builder-main">
    <div class="unit-builder-page">
      <slot />
    </div>
  </VMain>
  <VFooter app :height="42" class="unit-builder-footer">© 2025 Cube</VFooter>
</template>

<style scoped>
.unit-builder-sidebar {
  border-right: 1px solid #ddd;
}

.unit-builder-main {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.unit-builder-page {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.unit-builder-footer {
  padding-inline: 24px;
  background: #222;
  color: #fff;
}
</style>
