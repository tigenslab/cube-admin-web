<script setup lang="ts">
import type { Course } from '~/stores/courses'
import type { CourseContentItem } from '~/composables/useCourseContentApi'
const route = useRoute()
const coursesStore = useCoursesStore()
const contentApi = useCourseContentApi()
const course = ref<Course | null>(null)
const units = ref<CourseContentItem[]>([])
const outline = ref<CourseContentItem[]>([])
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
const addUnitId = ref('')
const newUnitCode = ref('')
const newUnitTitle = ref('')
const addTargetParent = ref('')
const courseId = String(route.params.id)

const groups = computed(() => {
  const unitById = new Map(units.value.map(unit => [unit.id, unit]))
  const groupItems = outline.value.filter(item => item.type === 'CourseUnit::Group')
  const unitRefs = outline.value.filter(item => item.type === 'CourseUnit::Unit' && item.unit_id)
  const sections = groupItems.length ? [
    ...groupItems.map(group => {
      const path = [group.ancestry, group.id].filter(Boolean).join('/')
      return {
        id: group.id,
        title: group.title || group.code || 'Units',
        units: unitRefs.filter(item => (item.ancestry || '') === path)
          .map(item => unitById.get(item.unit_id!))
          .filter((unit): unit is CourseContentItem => Boolean(unit)),
      }
    }),
    ...(unitRefs.some(item => !item.ancestry) ? [{
      id: 'ungrouped',
      title: 'Other units',
      units: unitRefs.filter(item => !item.ancestry)
        .map(item => unitById.get(item.unit_id!))
        .filter((unit): unit is CourseContentItem => Boolean(unit)),
    }] : []),
  ] : unitRefs.length ? [{
    id: 'units',
    title: 'Units',
    units: unitRefs.map(item => unitById.get(item.unit_id!))
      .filter((unit): unit is CourseContentItem => Boolean(unit)),
  }] : []
  const query = search.value.trim().toLowerCase()
  const filtered = sections.map(section => ({
    ...section,
    units: section.units.filter(unit => !query || `${unit.code || ''} ${unit.title || ''}`.toLowerCase().includes(query)),
  }))
  return query ? filtered.filter(section => section.units.length) : filtered
})
const hasGroups = computed(() => outline.value.some(item => item.type === 'CourseUnit::Group'))
const availableUnits = computed(() => {
  const linked = new Set(outline.value.filter(item => item.type === 'CourseUnit::Unit').map(item => item.unit_id))
  return units.value.filter(unit => !linked.has(unit.id)).map(unit => ({
    title: `${unit.code || ''} — ${unit.title || 'Untitled unit'}`,
    value: unit.id,
  }))
})
async function loadUnits() {
  loadingUnits.value = true
  try {
    const [unitData, outlineData] = await Promise.all([
      contentApi.list(courseId, 'units'),
      contentApi.list(courseId, 'course_units'),
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
  addKind.value = 'unit'
  addUnitMode.value = availableUnits.value.length ? 'existing' : 'create'
  addTitle.value = ''
  addUnitId.value = availableUnits.value[0]?.value || ''
  newUnitCode.value = ''
  newUnitTitle.value = ''
  addTargetParent.value = ''
  addError.value = ''
  addDialog.value = true
}

function openAddUnitDialog(groupId?: string) {
  const group = groupId ? outline.value.find(item => item.id === groupId) : undefined
  addKind.value = 'unit'
  addUnitMode.value = availableUnits.value.length ? 'existing' : 'create'
  addTitle.value = ''
  addUnitId.value = availableUnits.value[0]?.value || ''
  newUnitCode.value = ''
  newUnitTitle.value = ''
  addTargetParent.value = group ? [group.ancestry, group.id].filter(Boolean).join('/') : ''
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
    const siblings = outline.value.filter(item => (item.ancestry || '') === addTargetParent.value)
    const position = Math.max(0, ...siblings.map(item => item.position || 0)) + 1
    const unitId = addKind.value === 'unit'
      ? addUnitMode.value === 'create'
        ? (await contentApi.save(courseId, 'units', {
            type: 'Unit',
            code: newUnitCode.value.trim(),
            title: newUnitTitle.value.trim(),
            content: {},
          })).id
        : addUnitId.value
      : ''
    await contentApi.save(courseId, 'course_units', addKind.value === 'group'
      ? { type: 'CourseUnit::Group', title: addTitle.value.trim(), ancestry: addTargetParent.value, position }
      : { type: 'CourseUnit::Unit', unit_id: unitId, ancestry: addTargetParent.value, position })
    addDialog.value = false
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
    <div v-if="!loadingUnits && !groups.length" class="pa-8 text-center text-medium-emphasis">No units found.</div>
    <VExpansionPanels v-else-if="hasGroups" v-model="openGroups" multiple variant="accordion">
      <VExpansionPanel v-for="group in groups" :key="group.id" :value="group.id">
        <VExpansionPanelTitle>{{ group.title }}</VExpansionPanelTitle>
        <VExpansionPanelText>
          <div class="d-flex justify-end mb-3">
            <VBtn v-if="course?.permissions?.update" color="primary" prepend-icon="mdi-plus" size="small" variant="tonal" @click="openAddUnitDialog(group.id)">Add unit</VBtn>
          </div>
          <div v-if="!group.units.length" class="pa-4 text-body-2 text-medium-emphasis">No units in this group yet.</div>
          <VRow v-else>
            <VCol v-for="(unit, index) in group.units" :key="unit.id" cols="12" md="4" sm="6">
              <VCard class="unit-card h-100" :to="`/courses/${courseId}/units/${unit.id}/edit`" rounded="lg" variant="flat">
                <div class="unit-banner d-flex align-end pa-3">
                  <span class="text-white text-subtitle-1 font-weight-medium">{{ index + 1 }} {{ unit.code || '' }}</span>
                </div>
                <VCardTitle class="text-body-1 font-weight-medium text-wrap">{{ unit.title || 'Untitled unit' }}</VCardTitle>
                <VCardText v-if="unit.content?.description" class="text-body-2 text-medium-emphasis">
                  {{ unit.content.description }}
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>
    <VRow v-else class="pa-5">
      <VCol v-for="(unit, index) in groups[0]?.units || []" :key="unit.id" cols="12" md="4" sm="6">
        <VCard class="unit-card h-100" :to="`/courses/${courseId}/units/${unit.id}/edit`" rounded="lg" variant="flat">
          <div class="unit-banner d-flex align-end pa-3">
            <span class="text-white text-subtitle-1 font-weight-medium">{{ index + 1 }} {{ unit.code || '' }}</span>
          </div>
          <VCardTitle class="text-body-1 font-weight-medium text-wrap">{{ unit.title || 'Untitled unit' }}</VCardTitle>
          <VCardText v-if="unit.content?.description" class="text-body-2 text-medium-emphasis">
            {{ unit.content.description }}
          </VCardText>
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
          <VSelect v-model="status" :items="['new', 'draft', 'ready', 'publish']" label="Status" />
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
      <VCardTitle class="pa-6 pb-2">Add to course</VCardTitle>
      <VCardText class="pa-6 pt-2">
        <VAlert v-if="addError" class="mb-4" color="error" density="compact" variant="tonal">{{ addError }}</VAlert>
        <VRadioGroup v-model="addKind" inline class="mb-2">
          <VRadio label="Individual unit" value="unit" />
          <VRadio label="Units group" value="group" />
        </VRadioGroup>
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
        <VBtn color="primary" :loading="adding" @click="addToCourse">Add</VBtn>
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
