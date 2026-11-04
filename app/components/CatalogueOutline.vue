<script setup lang="ts">
import type { CatalogueOutlineRow } from '~/composables/useCatalogueApi'

defineProps<{ rows: CatalogueOutlineRow[] }>()
</script>

<template>
  <VList lines="two" class="outline-list">
    <template v-for="row in rows" :key="row.id">
      <VListItem v-if="row.type === 'U'" rounded="lg">
        <template #prepend><VAvatar color="secondary" rounded="lg" variant="tonal"><VIcon icon="mdi-book-open-page-variant-outline" /></VAvatar></template>
        <VListItemTitle>{{ row.title }}</VListItemTitle>
        <VListItemSubtitle>{{ row.code || 'Course unit' }}</VListItemSubtitle>
      </VListItem>
      <div v-else class="outline-group">
        <div class="text-subtitle-2 font-weight-medium px-4 py-3">
          <VIcon class="mr-2" icon="mdi-folder-outline" size="small" />{{ row.title }}
        </div>
        <CatalogueOutline v-if="row.children?.length" :rows="row.children" />
      </div>
    </template>
  </VList>
</template>

<style scoped>
.outline-group { margin-left: 20px; border-left: 2px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.outline-list { background: transparent; }
</style>
