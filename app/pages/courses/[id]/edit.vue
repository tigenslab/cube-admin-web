<script setup lang="ts">
import type { Course } from '~/stores/courses'
import type { CourseResourceItem } from '~/types/course-resources'
import CourseUnitGroupPanels from '~/components/course-content/CourseUnitGroupPanels.vue'
import type { CourseUnitGroupNode } from '~/components/course-content/CourseUnitGroupPanels.vue'
const route = useRoute()
const coursesStore = useCoursesStore()
const courseUnitsApi = useCourseUnitsApi()
const unitsApi = useUnitsApi()
const course = ref<Course | null>(null)
const units = ref<CourseResourceItem[]>([])
const outline = ref<CourseResourceItem[]>([])
const search = ref('')
const openGroups = ref<string[]>([])
const loadingUnits = ref(false)
const title = ref('')
const code = ref('')
const subType = ref('')
const type = ref('')
const status = ref('new')
const submitting = ref(false)
const error = ref<string | null>(null)
const detailsDialog = ref(false)
const addDialog = ref(false)
const adding = ref(false)
const addError = ref('')
const addKind = ref<'group' | 'unit'>('unit')
const addUnitMode = ref<'existing' | 'create'>('existing')
const addTitle = ref('')
const editingGroup = ref<CourseResourceItem | null>(null)
const addUnitId = ref('')
const newUnitCode = ref('')
const newUnitTitle = ref('')
const addParentGroupId = ref<string | null>(null)
const courseId = String(route.params.id)

const groups = computed(() => {
  const unitById = new Map(units.value.map(unit => [unit.id, unit]))
  const nodes = new Map<string, CourseUnitGroupNode & { ancestry: string }>()
  for (const item of outline.value.filter(entry => entry.type === 'CourseUnit::Group')) {
    nodes.set(item.id, {
      id: item.id,
      title: item.title || item.code || 'Units',
      ancestry: item.ancestry || '',
      children: [],
      units: [],
      hasDescendants: false,
    })
  }
  const roots: Array<CourseUnitGroupNode & { ancestry: string }> = []
  for (const node of nodes.values()) {
    const parentId = node.ancestry.split('/').filter(Boolean).at(-1)
    const parent = parentId ? nodes.get(parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  for (const reference of outline.value.filter(item => item.type === 'CourseUnit::Unit' && item.unit_id)) {
    const unit = unitById.get(reference.unit_id!)
    if (!unit) continue
    const parentId = reference.ancestry?.split('/').filter(Boolean).at(-1)
    const parent = parentId ? nodes.get(parentId) : undefined
    if (parent) parent.units.push({ unit, reference })
  }
  const setDescendants = (node: CourseUnitGroupNode & { ancestry: string }) => {
    node.children.forEach(setDescendants)
    node.hasDescendants = node.children.length > 0 || node.units.length > 0
  }
  roots.forEach(setDescendants)
  const query = search.value.trim().toLowerCase()
  const filterNode = (node: CourseUnitGroupNode & { ancestry: string }): CourseUnitGroupNode | null => {
    const children = node.children.map(filterNode).filter((child): child is CourseUnitGroupNode => Boolean(child))
    const nodeUnits = node.units.filter(({ unit }) => !query || `${unit.code || ''} ${unit.title || ''}`.toLowerCase().includes(query))
    if (query && !nodeUnits.length && !children.length && !node.title.toLowerCase().includes(query)) return null
    return { ...node, children, units: nodeUnits, hasDescendants: node.children.length > 0 || node.units.length > 0 }
  }
  return roots.map(filterNode).filter((node): node is CourseUnitGroupNode => Boolean(node))
})
const hasGroups = computed(() => outline.value.some(item => item.type === 'CourseUnit::Group'))
const rootUnits = computed(() => {
  const unitById = new Map(units.value.map(unit => [unit.id, unit]))
  const query = search.value.trim().toLowerCase()
  return outline.value
    .filter(item => item.type === 'CourseUnit::Unit' && item.unit_id && !item.ancestry)
    .map(reference => ({ unit: unitById.get(reference.unit_id!)!, reference }))
    .filter(({ unit }) => unit && (!query || `${unit.code || ''} ${unit.title || ''}`.toLowerCase().includes(query)))
})
const availableUnits = computed(() => {
  const linked = new Set(outline.value.filter(item => item.type === 'CourseUnit::Unit').map(item => item.unit_id))
  return units.value.filter(unit => !linked.has(unit.id)).map(unit => ({
    title: `${unit.code || ''} — ${unit.title || 'Untitled unit'}`,
    value: unit.id,
  }))
})
const addParentLabel = computed(() => {
  if (!addParentGroupId.value) return 'Course root'
  const parent = outline.value.find(item => item.id === addParentGroupId.value)
  return parent?.title || parent?.code || 'Selected group'
})
async function deleteOutlineItem(item: CourseResourceItem) {
  const label = item.type === 'CourseUnit::Group' ? item.title || 'this group and its contents' : 'this unit from the course'
  if (!confirm(`Remove ${label}?${item.type === 'CourseUnit::Group' ? ' Its nested groups and unit links will also be removed from this course.' : ''}`)) return
  try {
    if (item.type === 'CourseUnit::Group') {
      const descendants = outline.value
        .filter(candidate => candidate.ancestry?.split('/').filter(Boolean).includes(item.id))
        .sort((a, b) => (b.ancestry?.split('/').filter(Boolean).length || 0) - (a.ancestry?.split('/').filter(Boolean).length || 0))
      for (const descendant of descendants) await courseUnitsApi.remove(courseId, descendant.id)
    }
    await courseUnitsApi.remove(courseId, item.id)
    await loadUnits()
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to remove this course item.')
  }
}

function deleteGroup(groupId: string) {
  const group = outline.value.find(item => item.id === groupId)
  if (group) return deleteOutlineItem(group)
}

function removeUnitReference(referenceId: string) {
  const reference = outline.value.find(item => item.id === referenceId)
  if (reference) return deleteOutlineItem(reference)
}

async function loadUnits() {
  loadingUnits.value = true
  try {
    const [unitData, outlineData] = await Promise.all([
      unitsApi.list(courseId),
      courseUnitsApi.list(courseId),
    ])
    units.value = unitData.items
    outline.value = outlineData.items
    for (const referencedUnit of outlineData.units || []) {
      if (!units.value.some(unit => unit.id === referencedUnit.id)) units.value.push(referencedUnit)
    }
    openGroups.value = outlineData.items.filter(item => item.type === 'CourseUnit::Group').map(item => item.id)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load course units.')
  } finally {
    loadingUnits.value = false
  }
}

onMounted(async () => {
  try {
    course.value = await coursesStore.show(String(route.params.id))
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load course.')
  }
  if (course.value) {
    title.value = course.value.title
    code.value = course.value.code
    subType.value = course.value.sub_type
    type.value = course.value.type
    status.value = course.value.status ?? 'new'
    await loadUnits()
  }
})

async function submit() {
  if (!course.value || !title.value.trim() || !code.value.trim() || !subType.value.trim() || !type.value.trim()) return
  submitting.value = true
  error.value = null
  try {
    course.value = await coursesStore.update(course.value.id, { title: title.value.trim(), code: code.value.trim(), sub_type: subType.value.trim(), type: type.value.trim(), status: status.value })
    detailsDialog.value = false
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to update course.')
  } finally {
    submitting.value = false
  }
}

function openAddDialog() {
  editingGroup.value = null
  addKind.value = 'unit'
  addUnitMode.value = availableUnits.value.length ? 'existing' : 'create'
  addTitle.value = ''
  addUnitId.value = availableUnits.value[0]?.value || ''
  newUnitCode.value = ''
  newUnitTitle.value = ''
  addParentGroupId.value = null
  addError.value = ''
  addDialog.value = true
}

function openAddUnitDialog(groupId?: string, kind: 'group' | 'unit' = 'unit') {
  editingGroup.value = null
  const group = groupId ? outline.value.find(item => item.id === groupId) : undefined
  addKind.value = kind
  addUnitMode.value = availableUnits.value.length ? 'existing' : 'create'
  addTitle.value = ''
  addUnitId.value = availableUnits.value[0]?.value || ''
  newUnitCode.value = ''
  newUnitTitle.value = ''
  addParentGroupId.value = group?.id || null
  addError.value = ''
  addDialog.value = true
}

function editGroup(groupId: string) {
  editingGroup.value = outline.value.find(item => item.id === groupId) || null
  if (!editingGroup.value) return
  addKind.value = 'group'
  addTitle.value = editingGroup.value.title || ''
  addParentGroupId.value = editingGroup.value.ancestry?.split('/').filter(Boolean).at(-1) || null
  addError.value = ''
  addDialog.value = true
}

async function addToCourse() {
  if (adding.value) return
  if (addKind.value === 'group' && !addTitle.value.trim()) {
    addError.value = 'Enter a group name.'
    return
  }
  if (addKind.value === 'unit' && addUnitMode.value === 'existing' && !addUnitId.value) {
    addError.value = 'Select a unit to add.'
    return
  }
  if (addKind.value === 'unit' && addUnitMode.value === 'create' && (!newUnitCode.value.trim() || !newUnitTitle.value.trim())) {
    addError.value = 'Enter a code and title for the new unit.'
    return
  }

  adding.value = true
  addError.value = ''
  try {
    const parentGroup = addParentGroupId.value
      ? outline.value.find(item => item.id === addParentGroupId.value)
      : undefined
    if (addParentGroupId.value && !parentGroup) throw new Error('The parent group could not be found. Reload the course and try again.')
    const ancestry = parentGroup ? [parentGroup.ancestry, parentGroup.id].filter(Boolean).join('/') : ''
    const siblings = outline.value.filter(item => (item.ancestry || '') === ancestry)
    const position = Math.max(0, ...siblings.map(item => item.position || 0)) + 1
    const unitId = addKind.value === 'unit'
      ? addUnitMode.value === 'create'
        ? (await unitsApi.save(courseId, {
            type: 'Unit',
            code: newUnitCode.value.trim(),
            title: newUnitTitle.value.trim(),
            content: {},
          })).id
        : addUnitId.value
      : ''
    await courseUnitsApi.save(courseId, addKind.value === 'group'
      ? { type: 'CourseUnit::Group', title: addTitle.value.trim(), ancestry, position: editingGroup.value?.position || position }
      : { type: 'CourseUnit::Unit', unit_id: unitId, ancestry, position }, editingGroup.value?.id)
    addDialog.value = false
    editingGroup.value = null
    await loadUnits()
  } catch (cause) {
    addError.value = getApiErrorMessage(cause, 'Unable to add item to the course.')
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <section class="page-header mb-8">
    <div>
      <div class="text-overline text-primary font-weight-bold">LEARNING</div>
      <h1 class="text-h4 font-weight-bold mt-1">{{ course?.title || 'Edit course' }}</h1>
    </div>
    <div class="d-flex ga-3">
      <VBtn :to="`/courses/${courseId}/dashboard`" variant="text">Back</VBtn>
      <VBtn color="primary" prepend-icon="mdi-pencil-outline" :disabled="!course?.permissions?.update" @click="detailsDialog = true">Course details</VBtn>
    </div>
  </section>
  <VAlert v-if="error && !detailsDialog" class="mb-5" color="error" density="compact" variant="tonal">{{ error }}</VAlert>

  <VCard class="mt-6" rounded="xl" variant="flat">
    <div class="d-flex align-center justify-space-between ga-4 bg-grey-lighten-4 px-5 py-2">
      <VTextField v-model="search" class="unit-search" density="compact" hide-details placeholder="Search" prepend-inner-icon="mdi-magnify" rounded="lg" variant="solo" />
      <VBtn v-if="course?.permissions?.update" color="primary" prepend-icon="mdi-plus" variant="text" @click="openAddDialog">Add to course</VBtn>
    </div>
    <VProgressLinear v-if="loadingUnits" color="primary" indeterminate />
    <div v-if="!loadingUnits && !groups.length && !rootUnits.length" class="pa-8 text-center text-medium-emphasis">No units found.</div>
    <CourseUnitGroupPanels
      v-if="hasGroups && groups.length"
      :groups="groups"
      :open-groups="openGroups"
      :course-id="courseId"
      :editable="Boolean(course?.permissions?.update)"
      :deletable="Boolean(course?.permissions?.delete)"
      @update:open-groups="openGroups = $event"
      @add-unit="openAddUnitDialog($event)"
      @edit-group="editGroup($event)"
      @delete-group="deleteGroup($event)"
      @remove-unit="removeUnitReference($event)"
    />
    <div v-if="hasGroups && rootUnits.length" class="pa-5">
      <h2 class="text-subtitle-1 font-weight-medium mb-4">Other units</h2>
      <VRow>
        <VCol v-for="(entry, index) in rootUnits" :key="entry.reference.id" cols="12" md="4" sm="6">
          <VCard class="unit-card h-100" :to="`/courses/${courseId}/units/${entry.unit.id}/edit`" rounded="lg" variant="flat">
            <div class="unit-banner d-flex align-end pa-3">
              <span class="text-white text-subtitle-1 font-weight-medium">{{ index + 1 }} {{ entry.unit.code || '' }}</span>
            </div>
            <VCardTitle class="text-body-1 font-weight-medium text-wrap">{{ entry.unit.title || 'Untitled unit' }}</VCardTitle>
            <VCardText v-if="entry.unit.content?.description" class="text-body-2 text-medium-emphasis">{{ entry.unit.content.description }}</VCardText>
            <VCardActions v-if="course?.permissions?.delete" class="justify-end">
              <VBtn aria-label="Remove unit from course" color="error" density="compact" prepend-icon="mdi-delete-outline" size="small" variant="text" @click.stop="removeUnitReference(entry.reference.id)">Remove from course</VBtn>
            </VCardActions>
          </VCard>
        </VCol>
      </VRow>
    </div>
    <VRow v-else-if="!hasGroups && rootUnits.length" class="pa-5">
      <VCol v-for="(entry, index) in rootUnits" :key="entry.reference.id" cols="12" md="4" sm="6">
        <VCard class="unit-card h-100" :to="`/courses/${courseId}/units/${entry.unit.id}/edit`" rounded="lg" variant="flat">
          <div class="unit-banner d-flex align-end pa-3"><span class="text-white text-subtitle-1 font-weight-medium">{{ index + 1 }} {{ entry.unit.code || '' }}</span></div>
          <VCardTitle class="text-body-1 font-weight-medium text-wrap">{{ entry.unit.title || 'Untitled unit' }}</VCardTitle>
          <VCardText v-if="entry.unit.content?.description" class="text-body-2 text-medium-emphasis">{{ entry.unit.content.description }}</VCardText>
          <VCardActions v-if="course?.permissions?.delete" class="justify-end">
            <VBtn aria-label="Remove unit from course" color="error" density="compact" prepend-icon="mdi-delete-outline" size="small" variant="text" @click.stop="removeUnitReference(entry.reference.id)">Remove from course</VBtn>
          </VCardActions>
        </VCard>
      </VCol>
    </VRow>
  </VCard>

  <VDialog v-model="detailsDialog" max-width="640">
    <VCard rounded="xl">
      <VCardTitle class="pa-6 pb-2">Course details</VCardTitle>
      <VCardText class="pa-6 pt-2">
        <VAlert v-if="error" class="mb-5" color="error" density="compact" variant="tonal">{{ error }}</VAlert>
        <VForm @submit.prevent="submit">
          <VTextField v-model="title" class="mb-3" label="Title" required />
          <VTextField v-model="code" class="mb-3" label="Code" required />
          <VTextField v-model="subType" class="mb-3" label="Sub-type" required />
          <VTextField v-model="type" class="mb-3" label="Type" required />
          <VSelect v-model="status" :items="['new', 'draft', 'ready', 'published']" label="Status" />
          <div class="d-flex justify-end ga-3 mt-4">
            <VBtn :disabled="submitting" variant="text" @click="detailsDialog = false">Cancel</VBtn>
            <VBtn color="primary" :loading="submitting" type="submit">Save changes</VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>

  <VDialog v-model="addDialog" max-width="600">
    <VCard rounded="xl">
      <VCardTitle class="pa-6 pb-2">{{ editingGroup ? 'Edit group' : 'Add to course' }}</VCardTitle>
      <VCardText class="pa-6 pt-2">
        <VAlert v-if="addError" class="mb-4" color="error" density="compact" variant="tonal">{{ addError }}</VAlert>
        <VRadioGroup v-model="addKind" inline class="mb-2">
          <VRadio label="Individual unit" value="unit" />
          <VRadio label="Create group" value="group" />
        </VRadioGroup>
        <div class="mb-4 text-body-2 text-medium-emphasis">Adding under: <strong>{{ addParentLabel }}</strong></div>
        <template v-if="addKind === 'unit'">
          <VRadioGroup v-model="addUnitMode" inline class="mb-2">
            <VRadio label="Select existing unit" value="existing" :disabled="!availableUnits.length" />
            <VRadio label="Create new unit" value="create" />
          </VRadioGroup>
          <VSelect v-if="addUnitMode === 'existing'" v-model="addUnitId" :items="availableUnits" label="Unit" no-data-text="All available units are already in this course." />
          <template v-else>
            <VTextField v-model="newUnitCode" class="mb-3" label="Unit code" required />
            <VTextField v-model="newUnitTitle" label="Unit title" required />
          </template>
        </template>
        <VTextField v-else v-model="addTitle" label="Group name" autofocus />
      </VCardText>
      <VCardActions class="pa-6 pt-0">
        <VSpacer />
        <VBtn :disabled="adding" variant="text" @click="addDialog = false">Cancel</VBtn>
        <VBtn color="primary" :loading="adding" @click="addToCourse">{{ editingGroup ? 'Save group' : 'Add' }}</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.unit-search { max-width: 320px; }
.unit-banner {
  min-height: 100px;
  background: linear-gradient(145deg, #d9987d, #f2c0a3 58%, #c87860);
}
</style>
