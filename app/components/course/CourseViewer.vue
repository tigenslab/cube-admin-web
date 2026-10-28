<script setup lang="ts">
import type { Course } from '~/stores/courses'
import type { CourseResourceItem } from '~/types/course-resources'

const props = defineProps<{
  embedded?: boolean
  courseId?: string
  selectedVersion?: number | 'current' | null
}>()
const route = useRoute()
const router = useRouter()
const courseId = computed(() => props.courseId || String(route.params.id))
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
const selectedVersion = ref<number | null>(typeof props.selectedVersion === 'number' ? props.selectedVersion : null)
const isCurrentView = computed(() => props.embedded ? props.selectedVersion === 'current' : route.query.current === 'true')
const isVersionView = computed(() => props.embedded
  ? typeof props.selectedVersion === 'number'
  : Boolean(course.value && course.value.status !== 'draft' && !isCurrentView.value))
const canEditUnits = computed(() => props.embedded && props.selectedVersion === 'current' && course.value?.permissions?.update)
const dashboardPath = computed(() => `/courses/${encodeURIComponent(courseId.value)}/${isCurrentView.value ? 'current' : selectedVersion.value || 'current'}/dashboard`)

const groups = computed(() => {
  const unitById = new Map(units.value.map(unit => [unit.id, unit]))
  const groupItems = outline.value.filter(item => item.type === 'G')
  const unitRefs = outline.value.filter(item => item.type === 'U' && item.unit_id)
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
const hasGroups = computed(() => outline.value.some(item => item.type === 'G'))

function flattenSnapshotOutline(rows: Record<string, any>[], ancestry = '', result: CourseResourceItem[] = []) {
  for (const row of rows) {
    const rowAncestry = String(row.ancestry ?? ancestry)
    result.push({ id: String(row.id), type: String(row.type), title: row.title, unit_id: row.unit_id, ancestry: rowAncestry, position: row.position })
    const childAncestry = row.type === 'G' ? [rowAncestry, row.id].filter(Boolean).join('/') : rowAncestry
    flattenSnapshotOutline(row.children || [], childAncestry, result)
  }
  return result
}

function setSnapshot(snapshot: Record<string, any>) {
  course.value = { ...course.value, ...snapshot.course, id: courseId.value } as Course
  units.value = (snapshot.units || []).map((reference: Record<string, any>) => reference.unit).filter(Boolean)
  outline.value = flattenSnapshotOutline(snapshot.course_units || [])
  openGroups.value = outline.value.filter(item => item.type === 'G').map(item => item.id)
}

async function loadVersion(version: number) {
  setSnapshot(await courses.version(courseId.value, version))
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const courseData = await courses.show(courseId.value)
    course.value = courseData
    if (props.embedded && typeof props.selectedVersion === 'number') {
      selectedVersion.value = props.selectedVersion
      await loadVersion(props.selectedVersion)
      return
    }
    if (props.embedded && courseData.status !== 'draft' && !isCurrentView.value) {
      selectedVersion.value = null
      units.value = []
      outline.value = []
      error.value = 'No saved course version is available yet.'
      return
    }
    if (!props.embedded && courseData.status !== 'draft' && !isCurrentView.value) {
      const latest = [...(courseData.versions || [])].sort((a, b) => b.version - a.version)[0]?.version ?? courseData.published_version
      const requestedVersion = Number(route.query.version)
      selectedVersion.value = courseData.versions?.some(item => item.version === requestedVersion)
        ? requestedVersion
        : selectedVersion.value && courseData.versions?.some(item => item.version === selectedVersion.value)
          ? selectedVersion.value
          : latest || null
      if (!selectedVersion.value) {
        units.value = []
        outline.value = []
        error.value = 'No saved course version is available yet.'
        return
      }
      if (String(route.query.version || '') !== String(selectedVersion.value)) {
        await router.replace({ query: { ...route.query, version: String(selectedVersion.value) } })
      }
      await loadVersion(selectedVersion.value)
      return
    }
    selectedVersion.value = null
    if (route.query.version) {
      const query = { ...route.query }
      delete query.version
      await router.replace({ query })
    }
    const [unitData, outlineData] = await Promise.all([unitsApi.list(courseId.value), courseUnitsApi.list(courseId.value)])
    units.value = unitData.items
    outline.value = outlineData.items
    for (const referencedUnit of outlineData.units || []) {
      if (!units.value.some(unit => unit.id === referencedUnit.id)) units.value.push(referencedUnit)
    }
    openGroups.value = outlineData.items.filter(item => item.type === 'G').map(item => item.id)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load course units.')
  } finally {
    loading.value = false
  }
}

async function switchVersion(version: number | null) {
  if (!version || version === selectedVersion.value) return
  selectedVersion.value = version
  await router.replace({ query: { ...route.query, version: String(version) } })
  loading.value = true
  error.value = ''
  try {
    await loadVersion(version)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load this course version.')
  } finally {
    loading.value = false
  }
}

function unitViewPath(unitId: string) {
  if (canEditUnits.value) return `/courses/${encodeURIComponent(courseId.value)}/units/${encodeURIComponent(unitId)}/edit`
  const path = `/courses/${encodeURIComponent(courseId.value)}/units/${encodeURIComponent(unitId)}/view`
  if (isCurrentView.value) return `${path}?current=true`
  return isVersionView.value && selectedVersion.value ? `${path}?version=${selectedVersion.value}` : path
}

onMounted(load)
watch(() => props.selectedVersion, (version, previousVersion) => {
  if (props.embedded && version !== previousVersion) load()
})
</script>

<template>
  <div v-if="!embedded" class="d-flex align-center ga-3 mb-5">
    <VBtn aria-label="Back to course dashboard" icon="mdi-arrow-left" :to="dashboardPath" variant="text" />
    <h1 class="text-h5 font-weight-bold">{{ course?.title || 'Course' }}</h1>
  </div>

  <VAlert v-if="error" class="mb-4" color="error" variant="tonal">
    {{ error }} <VBtn size="small" variant="text" @click="load">Retry</VBtn>
  </VAlert>

  <VCard rounded="xl" variant="flat">
    <div class="d-flex align-center justify-space-between ga-4 bg-grey-lighten-4 px-5 py-2">
      <VTextField v-model="search" class="unit-search" density="compact" hide-details placeholder="Search" prepend-inner-icon="mdi-magnify" rounded="lg" variant="solo" />
      <div class="d-flex align-center ga-3">
        <VSelect
          v-if="!embedded && isVersionView && course?.versions?.length"
          :model-value="selectedVersion"
          class="version-select"
          density="compact"
          hide-details
          item-title="label"
          item-value="version"
          :items="course.versions.slice().sort((a, b) => b.version - a.version).map(item => ({ ...item, label: `Version ${item.version}` }))"
          label="Course version"
          variant="outlined"
          @update:model-value="switchVersion(Number($event))"
        />
        <span class="text-body-2">{{ isCurrentView ? 'Current' : isVersionView ? `Version ${selectedVersion ?? '—'}` : 'View only' }}</span>
      </div>
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
              <VCard class="unit-card h-100" :to="unitViewPath(unit.id)" rounded="lg" variant="flat">
                <div class="unit-banner d-flex align-end pa-3">
                  <span class="text-white text-subtitle-1 font-weight-medium">{{ index + 1 }} {{ unit.code || '' }}</span>
                  <VChip v-if="canEditUnits" class="ml-auto" color="white" size="small" variant="tonal"><VIcon icon="mdi-pencil-outline" start />Edit</VChip>
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
        <VCard class="unit-card h-100" :to="unitViewPath(unit.id)" rounded="lg" variant="flat">
          <div class="unit-banner d-flex align-end pa-3">
            <span class="text-white text-subtitle-1 font-weight-medium">{{ index + 1 }} {{ unit.code || '' }}</span>
            <VChip v-if="canEditUnits" class="ml-auto" color="white" size="small" variant="tonal"><VIcon icon="mdi-pencil-outline" start />Edit</VChip>
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
.version-select { width: 180px; }
.unit-banner {
  min-height: 100px;
  background: linear-gradient(145deg, #d9987d, #f2c0a3 58%, #c87860);
}
</style>
