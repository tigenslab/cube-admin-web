<script setup lang="ts">
import type { Course } from '~/stores/courses'
import type { CourseResourceItem } from '~/types/course-resources'
import type { CatalogueBlockTitle, CatalogueOutlineRow, CatalogueUnitSnapshot } from '~/composables/useCatalogueApi'
import CatalogueOutline from '~/components/CatalogueOutline.vue'

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
const unitBlocksApi = useUnitBlocksApi()
const unitsApi = useUnitsApi()
const course = ref<Course | null>(null)
const units = ref<CourseResourceItem[]>([])
const outline = ref<CourseResourceItem[]>([])
const search = ref('')
const loading = ref(true)
const error = ref('')
const selectedVersion = ref<number | null>(typeof props.selectedVersion === 'number' ? props.selectedVersion : null)
const isCurrentView = computed(() => props.embedded ? props.selectedVersion === 'current' : route.query.current === 'true')
const isVersionView = computed(() => props.embedded
  ? typeof props.selectedVersion === 'number'
  : Boolean(course.value && course.value.status !== 'draft' && !isCurrentView.value))
const canEditUnits = computed(() => props.embedded && props.selectedVersion === 'current' && course.value?.permissions?.update)
const dashboardPath = computed(() => `/courses/${encodeURIComponent(courseId.value)}/${isCurrentView.value ? 'current' : selectedVersion.value || 'current'}/dashboard`)

const outlineTree = computed(() => {
  const nodes = new Map<string, CatalogueOutlineRow>()
  const roots: CatalogueOutlineRow[] = []
  for (const row of outline.value) nodes.set(row.id, {
    ...row,
    type: row.unit_id || row.type === 'CourseUnit::Unit' ? 'U' : row.type === 'CourseUnit::Group' ? 'G' : row.type,
    children: [],
  })
  for (const row of outline.value) {
    const node = nodes.get(row.id)!
    const parentId = row.ancestry?.split('/').filter(Boolean).at(-1)
    const parent = parentId ? nodes.get(parentId) : undefined
    if (parent?.type === 'G') parent.children!.push(node)
    else roots.push(node)
  }
  const query = search.value.trim().toLowerCase()
  const filterRows = (rows: CatalogueOutlineRow[]): CatalogueOutlineRow[] => rows.flatMap((row) => {
    if (row.type === 'U') {
      const unit = units.value.find(item => item.id === row.unit_id)
      return !query || `${row.code || unit?.code || ''} ${row.title || unit?.title || ''}`.toLowerCase().includes(query) ? [row] : []
    }
    const children = filterRows(row.children || [])
    return !query || children.length ? [{ ...row, children }] : []
  })
  return filterRows(roots)
})
const outlineUnits = computed<CatalogueUnitSnapshot[]>(() => units.value.map((unit) => ({
  unit_id: unit.id,
  version: 0,
  unit: { id: unit.id, code: unit.code, title: unit.title },
  blocks: ((unit as CourseResourceItem & { blocks?: CatalogueUnitSnapshot['blocks'] }).blocks || []),
})))

function blockTitleTree(items: CourseResourceItem[]): CatalogueBlockTitle[] {
  const nodes = new Map<string, CatalogueBlockTitle & { ancestry?: string }>()
  const roots: CatalogueBlockTitle[] = []
  for (const item of items) nodes.set(item.id, {
    id: item.id,
    title: item.title || String(item.content?.title || item.type || 'Untitled block'),
    type: item.type,
    icon: String(item.merged_content?.icon || item.content?.icon || ''),
    ancestry: item.ancestry,
    children: [],
  })
  for (const item of items) {
    const node = nodes.get(item.id)!
    const parentId = item.ancestry?.split('/').filter(Boolean).at(-1)
    const parent = parentId ? nodes.get(parentId) : undefined
    if (parent) parent.children!.push(node)
    else roots.push(node)
  }
  const clean = (rows: CatalogueBlockTitle[]): CatalogueBlockTitle[] => rows.map(({ id, title, type, icon, children }) => ({
    id, title, ...(type ? { type } : {}), ...(icon ? { icon } : {}), ...(children?.length ? { children: clean(children) } : {}),
  }))
  return clean(roots)
}

function flattenSnapshotOutline(rows: Record<string, any>[], ancestry = '', result: CourseResourceItem[] = []) {
  for (const row of rows) {
    const rowAncestry = String(row.ancestry ?? ancestry)
    const type = row.unit_id || row.type === 'CourseUnit::Unit' ? 'U' : row.type === 'CourseUnit::Group' ? 'G' : String(row.type)
    result.push({ id: String(row.id), type, title: row.title, unit_id: row.unit_id, ancestry: rowAncestry, position: row.position })
    const childAncestry = type === 'G' ? [rowAncestry, row.id].filter(Boolean).join('/') : rowAncestry
    flattenSnapshotOutline(row.children || [], childAncestry, result)
  }
  return result
}

function setSnapshot(snapshot: Record<string, any>) {
  course.value = { ...course.value, ...snapshot.course, id: courseId.value } as Course
  units.value = (snapshot.units || []).map((reference: Record<string, any>) => ({
    ...reference.unit,
    blocks: reference.blocks || reference.unit?.blocks || [],
  })).filter(Boolean)
  outline.value = flattenSnapshotOutline(snapshot.course_units || [])
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
    units.value = await Promise.all(unitData.items.map(async (unit) => {
      const { items } = await unitBlocksApi.list(courseId.value, unit.id).catch(() => ({ items: [] }))
      return { ...unit, blocks: blockTitleTree(items) }
    }))
    outline.value = outlineData.items
    for (const referencedUnit of outlineData.units || []) {
      if (!units.value.some(unit => unit.id === referencedUnit.id)) units.value.push(referencedUnit)
    }
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
  const version = isCurrentView.value ? 'current' : selectedVersion.value || 'current'
  const path = `/courses/${encodeURIComponent(courseId.value)}/${version}/units/${encodeURIComponent(unitId)}`
  return `${path}/${canEditUnits.value ? 'edit' : 'view'}`
}

function blockViewPath(unitId: string, blockId: string) {
  return `${unitViewPath(unitId)}/blocks/${encodeURIComponent(blockId)}`
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
    <div v-if="!loading && !error && !outlineTree.length" class="pa-8 text-center text-medium-emphasis">No units found.</div>
    <CatalogueOutline
      v-else-if="!loading && outlineTree.length"
      :rows="outlineTree"
      :units="outlineUnits"
      :unit-path="unitViewPath"
      :block-path="blockViewPath"
      :show-block-titles="true"
    />
  </VCard>
</template>

<style scoped>
.unit-search { max-width: 320px; }
.version-select { width: 180px; }
</style>
