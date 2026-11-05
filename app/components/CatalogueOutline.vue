<script setup lang="ts">
import type { CatalogueOutlineRow, CatalogueUnitSnapshot } from '~/composables/useCatalogueApi'
import CatalogueBlockTitles from '~/components/CatalogueBlockTitles.vue'

defineOptions({ name: 'CatalogueOutline' })
const props = withDefaults(defineProps<{ rows: CatalogueOutlineRow[]; units: CatalogueUnitSnapshot[]; unitPath?: (unitId: string) => string; blockPath?: (unitId: string, blockId: string) => string; showBlockTitles?: boolean }>(), {
  showBlockTitles: true,
})
const unitSnapshots = computed(() => new Map(props.units.map(unit => [unit.unit_id, unit])))
const isUnit = (row: CatalogueOutlineRow) => row.type === 'U' || row.type === 'CourseUnit::Unit' || Boolean(row.unit_id)
const expandedRows = ref<string[]>([])
watch(() => props.rows, rows => { expandedRows.value = rows.map(row => row.id) }, { immediate: true })

function blockPathFor(row: CatalogueOutlineRow) {
  if (!props.blockPath || !row.unit_id) return undefined
  return (blockId: string) => props.blockPath!(row.unit_id!, blockId)
}
</script>

<template>
  <VExpansionPanels v-model="expandedRows" multiple variant="accordion">
    <VExpansionPanel v-for="row in rows" :key="row.id" :value="row.id">
      <VExpansionPanelTitle>
        <div class="d-flex align-center ga-3">
          <VIcon :icon="isUnit(row) ? 'mdi-book-open-page-variant-outline' : 'mdi-folder-outline'" />
          <span v-if="isUnit(row) && row.code" class="text-medium-emphasis">{{ row.code }}</span>
          <span>{{ row.title }}</span>
          <VChip v-if="isUnit(row)" class="ml-2" size="x-small" variant="tonal">
            {{ unitSnapshots.get(row.unit_id || '')?.blocks.length || 0 }} blocks
          </VChip>
        </div>
        <template #actions="{ expanded }">
          <div class="d-flex align-center ga-2">
            <VBtn
              v-if="isUnit(row) && row.unit_id && unitPath"
              class="text-none"
              color="primary"
              density="compact"
              size="small"
              variant="text"
              :to="unitPath(row.unit_id)"
              @click.stop
            >
              Open unit
            </VBtn>
            <VIcon :icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
          </div>
        </template>
      </VExpansionPanelTitle>
      <VExpansionPanelText>
        <div v-if="$slots.actions" class="d-flex justify-end ga-2 mb-3">
          <slot name="actions" :row="row" />
        </div>
        <template v-if="isUnit(row)">
          <template v-if="showBlockTitles !== false">
            <CatalogueBlockTitles v-if="unitSnapshots.get(row.unit_id || '')?.blocks.length" :blocks="unitSnapshots.get(row.unit_id || '')!.blocks" :block-path="blockPathFor(row)" />
            <div v-else class="text-body-2 text-medium-emphasis">No blocks in this unit.</div>
          </template>
        </template>
        <CatalogueOutline v-else-if="row.children?.length" :rows="row.children" :units="units" :unit-path="unitPath" :block-path="blockPath" :show-block-titles="showBlockTitles">
          <template #actions="slotProps"><slot name="actions" v-bind="slotProps" /></template>
        </CatalogueOutline>
      </VExpansionPanelText>
    </VExpansionPanel>
  </VExpansionPanels>
</template>

