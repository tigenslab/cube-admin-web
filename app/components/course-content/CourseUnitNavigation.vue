<script setup lang="ts">
import { displayCourseUnitCode, displayCourseUnitTitle } from '~/utils/course-unit-display'

export interface CourseUnitNavigationRow {
  id: string
  type: string
  title?: string
  code?: string
  unit_id?: string
  ancestry?: string
  position?: number
  children: CourseUnitNavigationRow[]
}

defineOptions({ name: 'CourseUnitNavigation' })

withDefaults(defineProps<{
  rows: CourseUnitNavigationRow[]
  selectedUnitId: string
  editable?: boolean
}>(), { editable: false })

const emit = defineEmits<{
  select: [unitId: string]
  addGroup: [parentId: string]
  addUnit: [parentId: string]
  editGroup: [row: CourseUnitNavigationRow]
  remove: [row: CourseUnitNavigationRow]
}>()

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
        <VListItem v-bind="activatorProps" :title="row.title || 'Untitled group'" prepend-icon="mdi-folder-outline">
          <template v-if="editable" #append>
            <VMenu location="end">
              <template #activator="{ props: menuProps }">
                <ButtonsBase v-bind="menuProps" aria-label="Group actions" density="compact" icon="mdi-dots-vertical" size="small" variant="text" @click.stop />
              </template>
              <VList density="comfortable" min-width="190">
                <VListItem prepend-icon="mdi-folder-plus-outline" title="Add group" @click.stop="emit('addGroup', row.id)" />
                <VListItem prepend-icon="mdi-book-plus-outline" title="Add unit" @click.stop="emit('addUnit', row.id)" />
                <VDivider class="my-1" />
                <VListItem prepend-icon="mdi-pencil-outline" title="Edit group" @click.stop="emit('editGroup', row)" />
                <VListItem color="error" prepend-icon="mdi-delete-outline" title="Delete group" @click.stop="emit('remove', row)" />
              </VList>
            </VMenu>
          </template>
        </VListItem>
      </template>
      <CourseUnitNavigation
        :rows="row.children"
        :selected-unit-id="selectedUnitId"
        :editable="editable"
        @select="emit('select', $event)"
        @add-group="emit('addGroup', $event)"
        @add-unit="emit('addUnit', $event)"
        @edit-group="emit('editGroup', $event)"
        @remove="emit('remove', $event)"
      />
    </VListGroup>
    <VListItem
      v-else-if="unitId(row)"
      :active="unitId(row) === selectedUnitId"
      :title="displayCourseUnitTitle(row)"
      :subtitle="displayCourseUnitCode(row)"
      prepend-icon="mdi-book-open-page-variant-outline"
      @click="emit('select', unitId(row))"
    >
      <template v-if="editable" #append>
        <VMenu location="end">
          <template #activator="{ props: menuProps }">
            <ButtonsBase v-bind="menuProps" aria-label="Unit actions" density="compact" icon="mdi-dots-vertical" size="small" variant="text" @click.stop />
          </template>
          <VList density="comfortable" min-width="190">
            <VListItem prepend-icon="mdi-pencil-outline" title="Edit unit" @click.stop="emit('select', unitId(row))" />
            <VListItem color="error" prepend-icon="mdi-link-off" title="Remove from course" @click.stop="emit('remove', row)" />
          </VList>
        </VMenu>
      </template>
    </VListItem>
  </template>
</template>
