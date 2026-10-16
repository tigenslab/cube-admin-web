<script setup lang="ts">
import type { CourseContentItem } from '~/composables/useCourseContentApi'

export interface CourseUnitGroupNode {
  id: string
  title: string
  hasDescendants: boolean
  children: CourseUnitGroupNode[]
  units: Array<{ unit: CourseContentItem; reference: CourseContentItem }>
}

defineOptions({ name: 'CourseUnitGroupPanels' })

const props = defineProps<{
  groups: CourseUnitGroupNode[]
  openGroups: string[]
  courseId: string
  editable?: boolean
  deletable?: boolean
}>()

const emit = defineEmits<{
  'update:openGroups': [value: string[]]
  'add-unit': [groupId: string]
  'edit-group': [groupId: string]
  'delete-group': [groupId: string]
  'remove-unit': [referenceId: string]
}>()

function updateOpenGroups(value: string[] | string | null) {
  const selected = Array.isArray(value) ? value : value ? [value] : []
  const currentPanelIds = new Set(props.groups.map(group => group.id))
  emit('update:openGroups', [...props.openGroups.filter(id => !currentPanelIds.has(id)), ...selected])
}
</script>

<template>
  <VExpansionPanels
    :model-value="openGroups"
    multiple
    variant="accordion"
    @update:model-value="updateOpenGroups($event)"
    @click.stop
  >
    <VExpansionPanel v-for="group in groups" :key="group.id" :value="group.id">
      <VExpansionPanelTitle>
        <div class="d-flex align-center w-100">
          <span>{{ group.title }}</span>
          <VSpacer />
          <VBtn v-if="editable" aria-label="Add unit to group" color="primary" density="compact" icon="mdi-plus" size="small" variant="text" @click.stop="emit('add-unit', group.id)" />
          <VBtn v-if="editable" aria-label="Edit group" density="compact" icon="mdi-pencil-outline" size="small" variant="text" @click.stop="emit('edit-group', group.id)" />
          <VBtn
            v-if="deletable"
            aria-label="Delete group"
            color="error"
            density="compact"
            icon="mdi-delete-outline"
            size="small"
            variant="text"
            :disabled="group.hasDescendants"
            :title="group.hasDescendants ? 'Remove its units and subgroups before deleting this group.' : 'Delete group'"
            @click.stop="emit('delete-group', group.id)"
          />
        </div>
      </VExpansionPanelTitle>
      <VExpansionPanelText>
        <div v-if="!group.units.length && !group.children.length" class="pa-4 text-body-2 text-medium-emphasis">No units or groups here yet.</div>
        <VRow v-if="group.units.length">
          <VCol v-for="(entry, index) in group.units" :key="entry.reference.id" cols="12" md="4" sm="6">
            <VCard class="unit-card h-100" :to="editable ? `/courses/${courseId}/units/${entry.unit.id}/edit` : undefined" rounded="lg" variant="flat">
              <div class="unit-banner d-flex align-end pa-3">
                <span class="text-white text-subtitle-1 font-weight-medium">{{ index + 1 }} {{ entry.unit.code || '' }}</span>
              </div>
              <VCardTitle class="text-body-1 font-weight-medium text-wrap">{{ entry.unit.title || 'Untitled unit' }}</VCardTitle>
              <VCardText v-if="entry.unit.content?.description" class="text-body-2 text-medium-emphasis">{{ entry.unit.content.description }}</VCardText>
              <VCardActions v-if="deletable" class="justify-end">
                <VBtn aria-label="Remove unit from course" color="error" density="compact" prepend-icon="mdi-delete-outline" size="small" variant="text" @click.stop="emit('remove-unit', entry.reference.id)">Remove from course</VBtn>
              </VCardActions>
            </VCard>
          </VCol>
        </VRow>
        <CourseUnitGroupPanels
          v-if="group.children.length"
          :groups="group.children"
          :open-groups="openGroups"
          :course-id="courseId"
          :editable="editable"
          :deletable="deletable"
          @update:open-groups="emit('update:openGroups', $event)"
          @add-unit="emit('add-unit', $event)"
          @edit-group="emit('edit-group', $event)"
          @delete-group="emit('delete-group', $event)"
          @remove-unit="emit('remove-unit', $event)"
        />
      </VExpansionPanelText>
    </VExpansionPanel>
  </VExpansionPanels>
</template>

<style scoped>
.unit-banner { min-height: 100px; background: linear-gradient(145deg, #d9987d, #f2c0a3 58%, #c87860); }
</style>
