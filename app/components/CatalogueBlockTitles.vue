<script setup lang="ts">
import type { CatalogueBlockTitle } from '~/composables/useCatalogueApi'

defineOptions({ name: 'CatalogueBlockTitles' })
const props = defineProps<{ blocks: CatalogueBlockTitle[] }>()

const rows = computed(() => {
  const result: { id: string; title: string; depth: number }[] = []
  const visit = (blocks: CatalogueBlockTitle[], depth = 0) => {
    blocks.forEach((block, index) => {
      result.push({ id: block.id || `${depth}-${index}-${block.title}`, title: block.title, depth })
      visit(block.children || [], depth + 1)
    })
  }
  visit(props.blocks)
  return result
})
</script>

<template>
  <VList class="pa-0" density="compact">
    <VListItem v-for="block in rows" :key="block.id" :style="{ paddingInlineStart: `${16 + block.depth * 22}px` }">
      <template #prepend><VIcon icon="mdi-circle-small" /></template>
      <VListItemTitle>{{ block.title }}</VListItemTitle>
    </VListItem>
  </VList>
</template>
