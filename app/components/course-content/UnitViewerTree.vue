<script setup lang="ts">
import type { CourseResourceItem } from '~/types/course-resources'

export interface UnitViewerTreeNode extends CourseResourceItem {
  children: UnitViewerTreeNode[]
}

defineOptions({ name: 'UnitViewerTree' })

const props = defineProps<{
  nodes: UnitViewerTreeNode[]
  activeId: string | null
  title: (item: CourseResourceItem) => string
}>()

const emit = defineEmits<{ select: [id: string] }>()

function isGroup(node: UnitViewerTreeNode) {
  return ['UnitBlock::Group', 'UnitBlock::Theory', 'UnitBlock::Assessment'].includes(node.type)
}

function icon(node: UnitViewerTreeNode) {
  if (node.type === 'UnitBlock::Theory') return 'mdi-book-open-variant'
  if (node.type === 'UnitBlock::Assessment') return 'mdi-clipboard-list-outline'
  if (node.type === 'UnitBlock::Group') return 'mdi-folder-outline'
  if (node.type === 'UnitBlock::Assessment::Block') return 'mdi-clipboard-text-outline'
  return 'mdi-bookmark-outline'
}
</script>

<template>
  <template v-for="node in nodes" :key="node.id">
    <VListGroup v-if="isGroup(node)" :value="node.id">
      <template #activator="{ props: activatorProps }">
        <VListItem
          v-bind="activatorProps"
          :active="activeId === node.id"
          :title="title(node)"
          :subtitle="String(node.children.length)"
          :prepend-icon="icon(node)"
          @click="emit('select', node.id)"
        />
      </template>
      <UnitViewerTree :nodes="node.children" :active-id="activeId" :title="title" @select="emit('select', $event)" />
    </VListGroup>
    <VListItem
      v-else
      :active="activeId === node.id"
      :title="title(node)"
      :subtitle="String(node.position || '—')"
      :prepend-icon="icon(node)"
      @click="emit('select', node.id)"
    />
  </template>
</template>
