<script setup lang="ts">
import type { CatalogueOutlineRow, CatalogueUnitSnapshot } from '~/composables/useCatalogueApi'
import CatalogueBlockTitles from '~/components/CatalogueBlockTitles.vue'

defineOptions({ name: 'CatalogueOutline' })
const props = defineProps<{ rows: CatalogueOutlineRow[]; units: CatalogueUnitSnapshot[] }>()
const unitSnapshots = computed(() => new Map(props.units.map(unit => [unit.unit_id, unit])))
</script>

<template>
  <VExpansionPanels multiple variant="accordion">
    <VExpansionPanel v-for="row in rows" :key="row.id" :value="row.id">
      <VExpansionPanelTitle>
        <div class="d-flex align-center ga-3">
          <VIcon :icon="row.type === 'U' ? 'mdi-book-open-page-variant-outline' : 'mdi-folder-outline'" />
          <span v-if="row.type === 'U' && row.code" class="text-medium-emphasis">{{ row.code }}</span>
          <span>{{ row.title }}</span>
        </div>
      </VExpansionPanelTitle>
      <VExpansionPanelText>
        <template v-if="row.type === 'U'">
          <CatalogueBlockTitles v-if="unitSnapshots.get(row.unit_id || '')?.blocks.length" :blocks="unitSnapshots.get(row.unit_id || '')!.blocks" />
          <div v-else class="text-body-2 text-medium-emphasis">No blocks in this unit.</div>
        </template>
        <CatalogueOutline v-else-if="row.children?.length" :rows="row.children" :units="units" />
      </VExpansionPanelText>
    </VExpansionPanel>
  </VExpansionPanels>
</template>

