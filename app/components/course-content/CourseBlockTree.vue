<script setup lang="ts">
import type { CourseResourceItem } from '~/types/course-resources'

export interface CourseBlockNode extends CourseResourceItem {
  children: CourseBlockNode[]
}

defineProps<{
  nodes: CourseBlockNode[]
  activeId: string | null
  title: (item: CourseResourceItem) => string
}>()

const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <template v-for="node in nodes" :key="node.id">
    <VListGroup v-if="node.children.length" :value="node.id">
      <template #activator="{ props }">
        <VListItem v-bind="props" :title="title(node)" :subtitle="node.position" :prepend-icon="String(node.merged_content?.icon || 'mdi-folder-outline')" />
      </template>
      <CourseBlockTree :nodes="node.children" :active-id="activeId" :title="title" @select="emit('select', $event)" />
    </VListGroup>
    <VListItem v-else :active="activeId === node.id" :title="title(node)" :subtitle="node.position" :prepend-icon="String(node.merged_content?.icon || 'mdi-segment')" @click="emit('select', node.id)" />
  </template>
</template>
