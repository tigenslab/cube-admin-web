<script setup lang="ts">
import type { CatalogueBlockTitle } from '~/stores/catalogue'

defineOptions({ name: 'CatalogueBlockTitles' })
const props = defineProps<{ blocks: CatalogueBlockTitle[]; blockPath?: (blockId: string) => string | undefined }>()

const rows = computed(() => {
  const result: { id: string; title: string; type?: string; icon?: string; depth: number; isLast: boolean; guides: boolean[] }[] = []
  const visit = (blocks: CatalogueBlockTitle[], guides: boolean[] = [], parentPath = '') => {
    blocks.forEach((block, index) => {
      const isLast = index === blocks.length - 1
      const children = block.children || []
      const path = `${parentPath}/${index}`
      result.push({
        id: block.id || `${path}-${block.title}`,
        title: block.title,
        type: block.type,
        icon: block.icon,
        depth: guides.length,
        isLast,
        guides,
      })
      visit(children, [...guides, !isLast], path)
    })
  }
  visit(props.blocks)
  return result
})

function blockIcon(block: typeof rows.value[number]) {
  if (block.icon) return block.icon
  if (['T:G', 'A:G'].includes(block.type || '')) return 'mdi-folder-outline'
  if (['T:B', 'A:B'].includes(block.type || '')) return 'mdi-bookmark-outline'
  return 'mdi-book-outline'
}
</script>

<template>
  <VList v-if="rows.length" class="block-tree" density="compact" role="tree" aria-label="Unit blocks">
    <VListItem
      v-for="block in rows"
      :key="block.id"
      class="block-tree__row"
      role="treeitem"
      :aria-level="block.depth + 1"
      :title="block.title"
      :to="block.id ? blockPath?.(block.id) : undefined"
    >
      <template #prepend>
        <span v-for="(continues, index) in block.guides" :key="index" class="block-tree__guide" :class="{ 'block-tree__guide--continues': continues }" />
        <span class="block-tree__branch" :class="{ 'block-tree__branch--last': block.isLast }" />
        <VIcon class="block-tree__icon" :icon="blockIcon(block)" size="small" />
      </template>
    </VListItem>
  </VList>
</template>

<style scoped>
.block-tree {
  border-inline-start: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  margin-inline-start: 4px;
  padding-block: 2px;
}

.block-tree__row {
  border-radius: 6px;
  min-height: 34px;
}

.block-tree__row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.block-tree__guide,
.block-tree__branch {
  display: inline-block;
  flex: 0 0 20px;
  height: 34px;
  position: relative;
}

.block-tree__guide::before,
.block-tree__branch::before,
.block-tree__branch::after {
  content: '';
  position: absolute;
}

.block-tree__guide--continues::before {
  border-inline-start: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  height: 100%;
  inset-inline-start: 11px;
}

.block-tree__branch::before {
  border-inline-start: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  height: 100%;
  inset-inline-start: 11px;
  top: 0;
}

.block-tree__branch::after {
  border-block-start: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  inset-inline-start: 11px;
  top: 50%;
  width: 11px;
}

.block-tree__branch--last::before {
  height: 50%;
}

.block-tree__icon {
  margin-inline-end: 8px;
}
</style>
