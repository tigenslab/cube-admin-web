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
const courseId = String(route.params.id)

const groups = computed(() => {
  const unitById = new Map(units.value.map(unit => [unit.id, unit]))
  const groupItems = outline.value.filter(item => item.type === 'CourseUnit::Group')
  const sections = groupItems.length ? groupItems.map(group => ({
    id: group.id,
    title: group.title || group.code || 'Units',
    units: outline.value
      .filter(item => item.type === 'CourseUnit::Unit' && item.unit_id && item.ancestry?.split('/').includes(group.id))
      .map(item => unitById.get(item.unit_id!))
      .filter((unit): unit is CourseContentItem => Boolean(unit)),
  })) : [{ id: 'units', title: 'Units', units: units.value }]
  const query = search.value.trim().toLowerCase()
  return sections.map(section => ({
    ...section,
    units: section.units.filter(unit => !query || `${unit.code || ''} ${unit.title || ''}`.toLowerCase().includes(query)),
  })).filter(section => section.units.length)
})
const hasGroups = computed(() => outline.value.some(item => item.type === 'CourseUnit::Group'))

async function loadUnits() {
  loadingUnits.value = true
  try {
    const [unitData, outlineData] = await Promise.all([
      contentApi.list(courseId, 'units'),
      contentApi.list(courseId, 'course_units'),
    ])
    units.value = unitData.items
    outline.value = outlineData.items
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
      <span class="text-body-2">Edit course</span>
    </div>
    <VProgressLinear v-if="loadingUnits" color="primary" indeterminate />
    <div v-if="!loadingUnits && !groups.length" class="pa-8 text-center text-medium-emphasis">No units found.</div>
    <VExpansionPanels v-else-if="hasGroups" v-model="openGroups" multiple variant="accordion">
      <VExpansionPanel v-for="group in groups" :key="group.id" :value="group.id">
        <VExpansionPanelTitle>{{ group.title }}</VExpansionPanelTitle>
        <VExpansionPanelText>
          <VRow>
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
</template>

<style scoped>
.unit-search { max-width: 320px; }
.unit-banner {
  min-height: 100px;
  background: linear-gradient(145deg, #d9987d, #f2c0a3 58%, #c87860);
}
</style>
