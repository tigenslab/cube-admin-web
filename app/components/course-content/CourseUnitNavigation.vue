<script setup lang="ts">
export interface CourseUnitNavigationRow {
  id: string
  type: string
  title?: string
  code?: string
  unit_id?: string
  children: CourseUnitNavigationRow[]
}

defineOptions({ name: 'CourseUnitNavigation' })

defineProps<{
  rows: CourseUnitNavigationRow[]
  selectedUnitId: string
}>()

const emit = defineEmits<{ select: [unitId: string] }>()

function isGroup(row: CourseUnitNavigationRow) {
  return row.type === 'G' || row.type === 'CourseUnit::Group'
}

function unitId(row: CourseUnitNavigationRow) {
  return row.unit_id || (row.type === 'U' || row.type === 'CourseUnit::Unit' ? row.id : '')
}
</script>

<template>
  <template v-for="row in rows" :key="row.id">
    <VListGroup v-if="isGroup(row)" :value="row.id">
      <template #activator="{ props: activatorProps }">
        <VListItem v-bind="activatorProps" :title="row.title || 'Untitled group'" prepend-icon="mdi-folder-outline" />
      </template>
      <CourseUnitNavigation :rows="row.children" :selected-unit-id="selectedUnitId" @select="emit('select', $event)" />
    </VListGroup>
    <VListItem
      v-else-if="unitId(row)"
      :active="unitId(row) === selectedUnitId"
      :title="row.title || 'Untitled unit'"
      :subtitle="row.code"
      prepend-icon="mdi-book-open-page-variant-outline"
      @click="emit('select', unitId(row))"
    />
  </template>
</template>
