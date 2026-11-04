<script setup lang="ts">
import type { CatalogueBlockTitle } from '~/composables/useCatalogueApi'

defineOptions({ name: 'CatalogueBlockTitles' })
defineProps<{ blocks: CatalogueBlockTitle[] }>()
</script>

<template>
  <ul class="block-tree">
    <li v-for="(block, index) in blocks" :key="block.id || `${block.title}-${index}`">
      <div class="block-title">{{ block.title }}</div>
      <CatalogueBlockTitles v-if="block.children?.length" :blocks="block.children" />
    </li>
  </ul>
</template>

<style scoped>
.block-tree { list-style: none; margin: 0; padding-left: 18px; }
.block-tree > li { border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); padding-left: 14px; }
.block-title { padding: 7px 0; }
</style>
