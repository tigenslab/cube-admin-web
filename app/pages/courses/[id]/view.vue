<script setup lang="ts">
import type { Course } from '~/stores/courses'
import type { CourseResourceItem } from '~/types/course-resources'

const route = useRoute()
const courseId = String(route.params.id)
const courses = useCoursesStore()
const courseUnitsApi = useCourseUnitsApi()
const unitsApi = useUnitsApi()
const course = ref<Course | null>(null)
const units = ref<CourseResourceItem[]>([])
const outline = ref<CourseResourceItem[]>([])
const search = ref('')
const openGroups = ref<string[]>([])
const loading = ref(true)
const error = ref('')

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
          .filter((unit): unit is CourseResourceItem => Boolean(unit)),
      }
    }),
    ...(unitRefs.some(item => !item.ancestry) ? [{
      id: 'ungrouped',
      title: 'Other units',
      units: unitRefs.filter(item => !item.ancestry)
        .map(item => unitById.get(item.unit_id!))
        .filter((unit): unit is CourseResourceItem => Boolean(unit)),
    }] : []),
  ] : unitRefs.length ? [{
    id: 'units',
    title: 'Units',
    units: unitRefs.map(item => unitById.get(item.unit_id!))
      .filter((unit): unit is CourseResourceItem => Boolean(unit)),
  }] : []
  const query = search.value.trim().toLowerCase()
  const filtered = sections.map(section => ({
    ...section,
    units: section.units.filter(unit => !query || `${unit.code || ''} ${unit.title || ''}`.toLowerCase().includes(query)),
  }))
  return query ? filtered.filter(section => section.units.length) : filtered
})
const hasGroups = computed(() => outline.value.some(item => item.type === 'CourseUnit::Group'))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [courseData, unitData, outlineData] = await Promise.all([
      courses.show(courseId),
      unitsApi.list(courseId),
      courseUnitsApi.list(courseId),
    ])
    course.value = courseData
    units.value = unitData.items
    outline.value = outlineData.items
    for (const referencedUnit of outlineData.units || []) {
      if (!units.value.some(unit => unit.id === referencedUnit.id)) units.value.push(referencedUnit)
    }
    openGroups.value = outlineData.items.filter(item => item.type === 'CourseUnit::Group').map(item => item.id)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load course units.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="d-flex align-center ga-3 mb-5">
    <VBtn aria-label="Back to course dashboard" icon="mdi-arrow-left" :to="`/courses/${courseId}/dashboard`" variant="text" />
    <h1 class="text-h5 font-weight-bold">{{ course?.title || 'Course' }}</h1>
  </div>

  <VAlert v-if="error" class="mb-4" color="error" variant="tonal">
    {{ error }} <VBtn size="small" variant="text" @click="load">Retry</VBtn>
  </VAlert>

  <VCard rounded="xl" variant="flat">
    <div class="d-flex align-center justify-space-between ga-4 bg-grey-lighten-4 px-5 py-2">
      <VTextField v-model="search" class="unit-search" density="compact" hide-details placeholder="Search" prepend-inner-icon="mdi-magnify" rounded="lg" variant="solo" />
      <span class="text-body-2">View only</span>
    </div>

    <VProgressLinear v-if="loading" color="primary" indeterminate />
    <div v-if="!loading && !error && !groups.length" class="pa-8 text-center text-medium-emphasis">No units found.</div>
    <VExpansionPanels v-else-if="hasGroups" v-model="openGroups" multiple variant="accordion">
      <VExpansionPanel v-for="group in groups" :key="group.id" :value="group.id">
        <VExpansionPanelTitle>{{ group.title }}</VExpansionPanelTitle>
        <VExpansionPanelText>
          <div v-if="!group.units.length" class="pa-4 text-body-2 text-medium-emphasis">No units in this group yet.</div>
          <VRow v-else>
            <VCol v-for="(unit, index) in group.units" :key="unit.id" cols="12" md="4" sm="6">
              <VCard class="unit-card h-100" :to="`/courses/${courseId}/units/${unit.id}/view`" rounded="lg" variant="flat">
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
        <VCard class="unit-card h-100" :to="`/courses/${courseId}/units/${unit.id}/view`" rounded="lg" variant="flat">
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
</template>

<style scoped>
.unit-search { max-width: 320px; }
.unit-banner {
  min-height: 100px;
  background: linear-gradient(145deg, #d9987d, #f2c0a3 58%, #c87860);
}
</style>
