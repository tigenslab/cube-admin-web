<script setup lang="ts">
const courseUnitsOpen = useState('unit-builder-course-units-open', () => true)
const unitStructureOpen = useState('unit-builder-unit-structure-open', () => true)
</script>

<template>
  <VAppBar flat height="72" class="unit-builder-topbar">
    <slot name="course-title" />
  </VAppBar>
  <VNavigationDrawer permanent :rail="!courseUnitsOpen" :width="280" :rail-width="60" class="course-units-sidebar">
    <VList density="compact" nav>
      <VListItem
        v-if="courseUnitsOpen"
        title="Course structure"
        prepend-icon="mdi-format-list-bulleted-square"
        rounded="lg"
      >
        <template #append>
          <VChip class="mr-1" color="primary" size="x-small" variant="tonal"><slot name="course-unit-count">0</slot></VChip>
          <VBtn aria-label="Collapse course structure" density="compact" icon="mdi-chevron-left" size="small" variant="text" @click.stop="courseUnitsOpen = false" />
        </template>
      </VListItem>
      <template v-else>
        <VListItem
          aria-label="Expand course structure"
          prepend-icon="mdi-format-list-bulleted-square"
          @click="courseUnitsOpen = true"
        />
        <slot name="course-units-rail" :expand="() => { courseUnitsOpen = true }" />
      </template>
    </VList>
    <div v-if="courseUnitsOpen" class="course-units-drawer-content">
      <slot name="course-units" :collapse="() => { courseUnitsOpen = false }" />
    </div>
  </VNavigationDrawer>
  <VNavigationDrawer permanent :rail="!unitStructureOpen" :width="320" :rail-width="60" class="unit-builder-sidebar">
    <div class="unit-drawer-frame">
      <VList density="compact" nav>
        <VListItem
          v-if="unitStructureOpen"
          title="Unit blocks"
          prepend-icon="mdi-file-tree-outline"
          rounded="lg"
        >
          <template #append>
            <VBtn aria-label="Collapse unit blocks" density="compact" icon="mdi-chevron-left" size="small" variant="text" @click.stop="unitStructureOpen = false" />
          </template>
        </VListItem>
        <VListItem
          v-else
          aria-label="Expand unit blocks"
          prepend-icon="mdi-file-tree-outline"
          @click="unitStructureOpen = true"
        />
      </VList>
      <div v-if="unitStructureOpen" class="unit-drawer-content"><slot name="sidebar" /></div>
    </div>
  </VNavigationDrawer>
  <VMain class="unit-builder-main">
    <div class="unit-builder-page">
      <div class="unit-builder-course-header">
        <slot name="course-header" />
      </div>
      <div class="unit-builder-page-content">
        <slot />
      </div>
    </div>
  </VMain>
  <VFooter app class="unit-builder-footer">
    <span class="footer-copyright">© 2025 Cube</span>
    <slot name="footer" />
  </VFooter>
</template>

<style scoped>
.unit-builder-topbar {
  border-bottom: 1px solid #e4e7ec;
  background: rgb(var(--v-theme-surface));
}

.course-units-sidebar {
  border-right: 1px solid #ddd;
}

.course-units-drawer-content,
.unit-drawer-frame,
.unit-drawer-content {
  min-height: 0;
}

.course-units-drawer-content {
  height: calc(100% - 56px);
}

.unit-drawer-frame {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.unit-drawer-content {
  flex: 1;
  overflow: hidden;
}

.unit-builder-sidebar {
  border-right: 1px solid #ddd;
}

.course-units-sidebar,
.unit-builder-sidebar {
  transition: width 220ms ease;
}

.unit-builder-main {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.unit-builder-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.unit-builder-course-header {
  flex: none;
}

.unit-builder-page-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
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
