<template>
  <VNavigationDrawer permanent :width="390" class="unit-builder-sidebar">
    <slot name="sidebar" />
  </VNavigationDrawer>
  <VMain class="unit-builder-main">
    <div class="unit-builder-page">
      <slot />
    </div>
  </VMain>
  <VFooter app class="unit-builder-footer">
    <span class="footer-copyright">© 2025 Cube</span>
    <slot name="footer" />
  </VFooter>
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
  display: flex;
  min-height: 42px;
  gap: 16px;
  padding-inline: 24px;
  background: #222;
  color: #fff;
}

.footer-copyright {
  flex: none;
}

.unit-builder-footer :deep(.footer-error) {
  flex: 0 1 auto;
  min-width: 0;
  max-width: min(70vw, 800px);
  margin-left: auto;
}
</style>
