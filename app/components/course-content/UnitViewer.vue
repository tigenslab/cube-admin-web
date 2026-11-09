<script setup lang="ts">
import type { CourseResourceItem, UnitBlockComponent } from '~/types/course-resources'
import type { Course } from '~/stores/courses'
import type { UnitViewerTreeNode } from '~/components/course-content/UnitViewerTree.vue'
import type { CourseUnitNavigationRow } from '~/components/course-content/CourseUnitNavigation.vue'
import UnitViewerTree from '~/components/course-content/UnitViewerTree.vue'
import CourseUnitNavigation from '~/components/course-content/CourseUnitNavigation.vue'
import { displayCourseUnitCode, displayCourseUnitTitle, unitMatchesCourseLevel } from '~/utils/course-unit-display'
import { displayCourseCode, displayCourseTitle } from '~/utils/course-display'

const route = useRoute()
const router = useRouter()
const courseId = String(route.params.id)
const unitId = String(route.params.unitId)
const courses = useCoursesStore()
const unitsApi = useUnitsApi()
const unitBlocksApi = useUnitBlocksApi()
const courseUnitsApi = useCourseUnitsApi()
const unitBlockComponentsApi = useUnitBlockComponentsApi()
const catalogueApi = useCatalogueApi()
const course = ref<Course | null>(null)
const courseUnits = ref<CourseUnitNavigationRow[]>([])
const catalogueVersions = ref<number[]>([])
const catalogueCourseId = ref<string | null>(null)
const unit = ref<CourseResourceItem | null>(null)
const blocks = ref<CourseResourceItem[]>([])
const blockComponents = ref<UnitBlockComponent[]>([])
const activeBlockId = ref<string | null>(null)
const componentsLoading = ref(false)
const openGroups = ref<string[]>([])
const openCourseUnitGroups = ref<string[]>([])
const loading = ref(true)
const error = ref('')
const selectedVersion = computed(() => {
  const value = Number(route.params.version)
  return Number.isInteger(value) && value > 0 ? value : null
})
const isCatalogueUnit = computed(() => Boolean(catalogueCourseId.value))
const selectedCatalogueVersion = ref<number | null>(null)
const versionSegment = computed(() => selectedVersion.value ? String(selectedVersion.value) : 'current')
const courseDashboardPath = computed(() => `/courses/${courseId}/${versionSegment.value}/dashboard`)
const courseUnitCount = computed(() => {
  const count = (rows: CourseUnitNavigationRow[]): number => rows.reduce((sum, row) => sum + (row.type === 'U' ? 1 : count(row.children)), 0)
  return count(courseUnits.value)
})
const flatCourseUnits = computed(() => {
  const units: CourseUnitNavigationRow[] = []
  const visit = (rows: CourseUnitNavigationRow[]) => {
    for (const row of rows) {
      if (row.type === 'U' && row.unit_id) units.push(row)
      visit(row.children)
    }
  }
  visit(courseUnits.value)
  return units
})
const versionOptions = computed(() => {
  if (isCatalogueUnit.value) return catalogueVersions.value.map(version => ({ title: `Version ${version}`, value: String(version) }))
  const options = (course.value?.versions || [])
    .slice()
    .sort((a, b) => b.version - a.version)
    .map(item => ({ title: `Version ${item.version}`, value: String(item.version) }))
  if (course.value?.permissions?.update || course.value?.permissions?.change_status) options.unshift({ title: 'Current', value: 'current' })
  return options
})

const activeBlock = computed(() => blocks.value.find(block => block.id === activeBlockId.value) || null)
let componentsRequest = 0

watch(activeBlockId, async (blockId) => {
  const request = ++componentsRequest
  blockComponents.value = []
  error.value = ''
  if (!blockId) {
    componentsLoading.value = false
    return
  }
  if (selectedVersion.value) {
    const block = activeBlock.value as (CourseResourceItem & { components?: UnitBlockComponent[] }) | null
    blockComponents.value = block?.components || []
    componentsLoading.value = false
    return
  }
  componentsLoading.value = true
  try {
    const result = await unitBlockComponentsApi.list(courseId, unitId, blockId)
    if (request === componentsRequest) blockComponents.value = result.items
  } catch (cause) {
    if (request === componentsRequest) error.value = getApiErrorMessage(cause, 'Unable to load block components.')
  } finally {
    if (request === componentsRequest) componentsLoading.value = false
  }
})
const tree = computed(() => {
  const nodes = new Map<string, UnitViewerTreeNode>()
  for (const block of blocks.value) nodes.set(block.id, { ...block, children: [] })
  const roots: UnitViewerTreeNode[] = []
  for (const node of nodes.values()) {
    const parentId = node.ancestry?.split('/').filter(Boolean).at(-1)
    const parent = parentId ? nodes.get(parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const sort = (items: UnitViewerTreeNode[]) => {
    items.sort((a, b) => (a.position || 0) - (b.position || 0))
    items.forEach(node => sort(node.children))
  }
  sort(roots)
  return roots
})

function blockTitle(block: CourseResourceItem) {
  return block.title || String(block.content?.title || block.metadata?.title || 'Untitled block')
}

function componentLabel(type: string) {
  const labels: Record<string, string> = {
    'T:TXT': 'Text',
    'T:LST': 'List',
    'T:MCQ': 'Multiple choice question',
    'T:TAB': 'Tabbed content',
    'T:IMG': 'Image',
    'T:VID': 'Video',
    'A:ESS': 'Essay',
  }
  return labels[type] || type.replaceAll(':', ' · ')
}

function componentIcon(type: string) {
  const icons: Record<string, string> = {
    'T:TXT': 'mdi-format-text',
    'T:LST': 'mdi-format-list-bulleted',
    'T:MCQ': 'mdi-help-circle-outline',
    'T:TAB': 'mdi-tab',
    'T:IMG': 'mdi-image-outline',
    'T:VID': 'mdi-video-outline',
    'A:ESS': 'mdi-text-box-edit-outline',
  }
  return icons[type] || 'mdi-shape-outline'
}

function componentFields(value: Record<string, unknown>) {
  const fields: { label: string; value: string | number | boolean | (string | number)[] }[] = []
  const visit = (item: unknown, path: string) => {
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      if (String(item).trim()) fields.push({ label: path, value: item })
    } else if (Array.isArray(item)) {
      const values = item.filter(entry => typeof entry === 'string' || typeof entry === 'number') as (string | number)[]
      if (values.length && values.length === item.length) fields.push({ label: path, value: values })
      else item.forEach((entry, index) => visit(entry, `${path} ${index + 1}`))
    } else if (item && typeof item === 'object') {
      for (const [key, child] of Object.entries(item)) {
        if (['id', 'type', 'component_id'].includes(key)) continue
        visit(child, path ? `${path} · ${key.replaceAll('_', ' ')}` : key.replaceAll('_', ' '))
      }
    }
  }
  visit(value, '')
  return fields
}

function blockPath(blockId: string) {
  return `/courses/${encodeURIComponent(courseId)}/${versionSegment.value}/units/${encodeURIComponent(unitId)}/view/blocks/${encodeURIComponent(blockId)}`
}

function setCourseUnits(rows: unknown[], unitItems: unknown[] = []) {
  const flattened: Record<string, any>[] = []
  const flatten = (items: unknown[], ancestry = '') => {
    for (const item of items) {
      const row = item as Record<string, any>
      const rowAncestry = String(row.ancestry ?? ancestry)
      flattened.push({ ...row, ancestry: rowAncestry })
      const childAncestry = [rowAncestry, row.id].filter(Boolean).join('/')
      flatten(Array.isArray(row.children) ? row.children : [], childAncestry)
    }
  }
  flatten(rows)
  const unitsById = new Map(unitItems.map(item => {
    const unit = item as Record<string, any>
    return [String(unit.unit_id || unit.id || unit.unit?.id || ''), unit] as const
  }))
  const nodes = new Map<string, CourseUnitNavigationRow>()
  for (const row of flattened) {
    const unitId = row.unit_id ? String(row.unit_id) : undefined
    const isUnit = Boolean(unitId) || row.type === 'U' || row.type === 'CourseUnit::Unit'
    const id = String(row.id || unitId || '')
    if (!id) continue
    const unit = unitId ? unitsById.get(unitId) : undefined
    const info = unit?.unit || unit
    if (isUnit && !unitMatchesCourseLevel(course.value?.type, course.value?.level, info?.level)) continue
    nodes.set(id, {
      id,
      type: isUnit ? 'U' : 'G',
      ...(isUnit ? { unit_id: unitId || id } : {}),
      title: isUnit ? info?.title || row.title : row.title,
      code: isUnit ? info?.code || row.code : row.code,
      ...(isUnit && info?.level !== undefined ? { level: Number(info.level) } : {}),
      children: [],
    })
  }
  const roots: CourseUnitNavigationRow[] = []
  for (const row of flattened) {
    const node = nodes.get(String(row.id || row.unit_id || ''))
    if (!node) continue
    const parentId = String(row.ancestry || '').split('/').filter(Boolean).at(-1)
    const parent = parentId ? nodes.get(parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  courseUnits.value = roots
  const groupIds: string[] = []
  const collectGroups = (items: CourseUnitNavigationRow[]) => {
    for (const item of items) {
      if (item.type !== 'U') groupIds.push(item.id)
      collectGroups(item.children)
    }
  }
  collectGroups(roots)
  openCourseUnitGroups.value = groupIds
}

async function navigateToUnit(nextUnitId: string) {
  if (!nextUnitId || nextUnitId === unitId) return
  await router.push(`/courses/${encodeURIComponent(courseId)}/${versionSegment.value}/units/${encodeURIComponent(nextUnitId)}/view`)
}

function selectCourseUnit(nextUnitId: string, collapse: () => void) {
  if (nextUnitId !== unitId) navigateToUnit(nextUnitId)
  collapse()
}

async function switchVersion(value: string | number | null) {
  const segment = String(value || '')
  if (!segment || segment === versionSegment.value) return
  await router.push(`/courses/${encodeURIComponent(courseId)}/${segment}/units/${encodeURIComponent(unitId)}/view`)
}

function selectBlock(blockId: string) {
  activeBlockId.value = blockId
  if (route.params.blockId !== blockId) router.push(blockPath(blockId))
}

watch(() => route.params.blockId, (value) => {
  if (typeof value === 'string' && blocks.value.some(block => block.id === value)) activeBlockId.value = value
})

async function load() {
  loading.value = true
  error.value = ''
  activeBlockId.value = null
  blockComponents.value = []
  try {
    const courseData = await courses.show(courseId)
    course.value = courseData
    catalogueCourseId.value = courseData.catalogue_course_id || null
    if (isCatalogueUnit.value) {
      const courseSnapshot = await catalogueApi.course(catalogueCourseId.value!, selectedVersion.value || undefined)
      catalogueVersions.value = courseSnapshot.versions || []
      setCourseUnits(courseSnapshot.course_units, courseSnapshot.units)
      const snapshot = await catalogueApi.courseUnit(catalogueCourseId.value!, selectedVersion.value || undefined, unitId)
      unit.value = { id: unitId, ...snapshot.unit } as CourseResourceItem
      blocks.value = flattenSnapshotBlocks(snapshot.blocks)
      selectedCatalogueVersion.value = snapshot.unit_version
    } else if (selectedVersion.value) {
      const [courseSnapshot, snapshot] = await Promise.all([
        courses.version(courseId, selectedVersion.value),
        courses.versionUnit(courseId, selectedVersion.value, unitId),
      ])
      setCourseUnits(courseSnapshot.course_units || [], courseSnapshot.units || [])
      unit.value = { id: unitId, ...snapshot.unit } as CourseResourceItem
      blocks.value = flattenSnapshotBlocks(snapshot.blocks)
    } else {
      const [unitData, blockData, courseUnitData] = await Promise.all([
        unitsApi.list(courseId),
        unitBlocksApi.list(courseId, unitId),
        courseUnitsApi.list(courseId),
      ])
      unit.value = unitData.items.find(item => item.id === unitId) || null
      blocks.value = blockData.items
      setCourseUnits(courseUnitData.items, courseUnitData.units)
    }
    if (!unit.value) throw new Error('Unit not found.')
    openGroups.value = blocks.value
      .filter(block => ['T:G', 'A:G'].includes(block.type))
      .map(block => block.id)
    const requestedId = typeof route.params.blockId === 'string' ? route.params.blockId : null
    if (requestedId && blocks.value.some(block => block.id === requestedId)) {
      activeBlockId.value = requestedId
    } else if (!blocks.value.some(block => block.id === activeBlockId.value)) {
      activeBlockId.value = blocks.value.find(block => !blocks.value.some(candidate => candidate.ancestry?.split('/').includes(block.id)))?.id || null
    }
    if (activeBlockId.value && route.params.blockId !== activeBlockId.value) {
      await router.replace(blockPath(activeBlockId.value))
    } else if (!activeBlockId.value && route.params.blockId) {
      await router.replace(`/courses/${courseId}/${versionSegment.value}/units/${unitId}/view`)
    }
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load unit content.')
  } finally {
    loading.value = false
  }
}

function flattenSnapshotBlocks(rows: Record<string, any>[], ancestry = '', result: CourseResourceItem[] = []) {
  for (const block of rows) {
    const blockAncestry = String(block.ancestry ?? ancestry)
    result.push({ ...block, ancestry: blockAncestry })
    flattenSnapshotBlocks(block.children || [], [blockAncestry, block.id].filter(Boolean).join('/'), result)
  }
  return result
}

onMounted(load)
watch(() => route.params.version, () => {
  load()
})
</script>

<template>
  <NuxtLayout name="unit-builder">
    <template #course-title>
      <div class="course-title-bar">
        <VBtn aria-label="Back to course dashboard" icon="mdi-arrow-left" :to="courseDashboardPath" variant="text" />
        <div class="course-title-text">
          <div class="course-title-name">{{ course ? displayCourseTitle(course, 'Course') : 'Course' }}</div>
          <div v-if="course?.code" class="text-caption text-medium-emphasis">{{ displayCourseCode(course) }}</div>
        </div>
        <VSpacer />
        <VSelect
          v-if="versionOptions.length"
          :model-value="versionSegment"
          :items="versionOptions"
          class="course-version-select"
          density="compact"
          hide-details
          label="Version"
          variant="outlined"
          @update:model-value="switchVersion"
        />
      </div>
    </template>

    <template #course-unit-count>{{ courseUnitCount }}</template>

    <template #course-units="{ collapse }">
      <VList v-if="courseUnitCount" v-model:opened="openCourseUnitGroups" class="course-unit-tree" density="compact" nav>
        <CourseUnitNavigation :rows="courseUnits" :selected-unit-id="unitId" :course-type="course?.type" @select="selectCourseUnit($event, collapse)" />
      </VList>
      <VList v-else class="course-unit-tree" density="compact" nav>
        <VListItem disabled prepend-icon="mdi-information-outline" title="No units in this course" />
      </VList>
    </template>

    <template #course-units-rail>
      <VListItem
        v-for="row in flatCourseUnits"
        :key="row.id"
        :active="row.unit_id === unitId"
        :aria-label="`${displayCourseUnitCode(course?.type, row)}: ${displayCourseUnitTitle(course?.type, row)}`"
        :title="displayCourseUnitTitle(course?.type, row)"
        :subtitle="displayCourseUnitCode(course?.type, row)"
        prepend-icon="mdi-book-open-page-variant-outline"
        @click="navigateToUnit(row.unit_id!)"
      />
    </template>

    <template #sidebar>
    <aside class="viewer-sidebar">
      <div class="unit-heading">
        <VIcon color="primary" icon="mdi-book-open-page-variant-outline" size="22" />
        <div class="unit-heading-text">
          <div class="text-caption text-medium-emphasis">{{ displayCourseUnitCode(course?.type, unit || {}) || 'Unit' }}</div>
          <strong>{{ displayCourseUnitTitle(course?.type, unit || {}) }}</strong>
        </div>
        <VMenu location="end">
          <template #activator="{ props }">
            <VBtn v-bind="props" aria-label="Unit view actions" icon="mdi-dots-vertical" variant="text" />
          </template>
          <VList>
            <VListItem v-if="!loading && !selectedVersion && !isCatalogueUnit" prepend-icon="mdi-pencil-outline" title="Edit unit" :to="`/courses/${courseId}/current/units/${unitId}/edit`" />
            <VDivider class="my-1" />
            <VListItem prepend-icon="mdi-arrow-left" title="Course dashboard" :to="courseDashboardPath" />
          </VList>
        </VMenu>
      </div>
      <VChip v-if="isCatalogueUnit && selectedCatalogueVersion" class="mx-4 mb-2 align-self-start" color="primary" size="x-small" variant="tonal">Source version {{ selectedCatalogueVersion }}</VChip>

      <VProgressLinear v-if="loading" color="primary" indeterminate />
      <div class="viewer-tree">
        <div v-if="!loading && !tree.length && !error" class="ma-3 pa-4 rounded-lg text-body-2 text-medium-emphasis bg-grey-lighten-4">No blocks in this unit yet.</div>
        <VList v-else v-model:opened="openGroups" class="unit-block-list" density="comfortable" nav>
          <UnitViewerTree :nodes="tree" :active-id="activeBlockId" :title="blockTitle" @select="selectBlock" />
        </VList>
      </div>
      <div class="viewer-account"><SessionAccountMenu /></div>
    </aside>
    </template>

    <div class="viewer-shell">
    <main class="viewer-main">
      <section class="viewer-content">
        <template v-if="activeBlock">
          <div class="workspace-heading">
            <div>
              <div class="text-overline text-medium-emphasis">{{ displayCourseUnitCode(course?.type, unit || {}) || 'Course unit' }}</div>
              <h1 class="text-h4 font-weight-bold">{{ blockTitle(activeBlock) }}</h1>
            </div>
            <VChip color="primary" prepend-icon="mdi-shape-outline" variant="tonal">{{ activeBlock.type }}</VChip>
          </div>
          <VCard class="block-summary-card mb-6" rounded="xl" variant="flat">
            <VCardText class="pa-6">
              <div class="d-flex align-center ga-3 mb-3">
                <VAvatar color="primary" rounded="lg" variant="tonal"><VIcon icon="mdi-file-document-outline" /></VAvatar>
                <div>
                  <div class="text-subtitle-1 font-weight-medium">Block overview</div>
                  <div class="text-caption text-medium-emphasis">{{ displayCourseUnitTitle(course?.type, unit || {}) }}</div>
                </div>
              </div>
              <p v-if="activeBlock.content?.description" class="block-description text-body-1">
                {{ activeBlock.content.description }}
              </p>
              <div v-else class="text-body-2 text-medium-emphasis">This block has no overview text.</div>
            </VCardText>
          </VCard>
          <div class="components-section">
            <div class="d-flex align-end justify-space-between mb-4">
              <div>
                <h2 class="text-h6 font-weight-bold">Block content</h2>
                <div class="text-body-2 text-medium-emphasis">{{ blockComponents.length }} {{ blockComponents.length === 1 ? 'component' : 'components' }}</div>
              </div>
            </div>
            <div v-if="componentsLoading" class="component-loading"><VProgressCircular color="primary" indeterminate size="24" /><span>Loading content…</span></div>
            <VCard v-else-if="!blockComponents.length" class="empty-components pa-8 text-center" rounded="xl" variant="flat">
              <VAvatar class="mb-3" color="grey" size="48" variant="tonal"><VIcon icon="mdi-text-box-outline" /></VAvatar>
              <div class="text-subtitle-1 font-weight-medium">No content yet</div>
              <div class="text-body-2 text-medium-emphasis mt-1">This block does not contain any components.</div>
            </VCard>
            <div v-else class="component-grid">
              <VCard v-for="(component, index) in blockComponents" :key="component.id" class="component-card" rounded="xl" variant="flat">
                <VCardTitle class="d-flex align-center ga-3 px-5 pt-5 pb-2 text-subtitle-1">
                  <VAvatar color="primary" rounded="lg" size="38" variant="tonal"><VIcon :icon="componentIcon(component.type)" size="20" /></VAvatar>
                  <span>{{ componentLabel(component.type) }}</span>
                  <VSpacer />
                  <span class="text-caption text-medium-emphasis">{{ String(index + 1).padStart(2, '0') }}</span>
                </VCardTitle>
                <VCardText class="component-card-content px-5 pb-5 pt-3">
                  <template v-if="componentFields(component.content).length">
                    <div v-for="field in componentFields(component.content)" :key="field.label" class="component-field">
                      <div v-if="field.label" class="component-field-label">{{ field.label }}</div>
                      <VList v-if="Array.isArray(field.value)" class="component-value-list" density="compact">
                        <VListItem v-for="(item, itemIndex) in field.value" :key="`${field.label}-${itemIndex}`" :title="String(item)" prepend-icon="mdi-circle-small" />
                      </VList>
                      <p v-else class="component-value">{{ field.value }}</p>
                    </div>
                  </template>
                  <div v-else class="text-body-2 text-medium-emphasis">No displayable content in this component.</div>
                </VCardText>
              </VCard>
            </div>
          </div>
        </template>
        <VCard v-else-if="loading" class="workspace-empty mx-auto pa-10 text-center" max-width="560" rounded="xl" variant="flat">
          <VProgressCircular class="mb-4" color="primary" indeterminate />
          <div class="text-h6 font-weight-bold">Loading course content</div>
          <div class="text-body-2 text-medium-emphasis mt-2">The unit structure and blocks are on their way.</div>
        </VCard>
        <VCard v-else-if="!tree.length" class="workspace-empty mx-auto pa-10 text-center" max-width="560" rounded="xl" variant="flat">
          <VAvatar class="mb-4" color="grey" size="56" variant="tonal"><VIcon icon="mdi-text-box-outline" size="28" /></VAvatar>
          <div class="text-h6 font-weight-bold">No blocks in this unit</div>
          <div class="text-body-2 text-medium-emphasis mt-2">There is no block content available to display.</div>
        </VCard>
        <VCard v-else class="workspace-empty mx-auto pa-10 text-center" max-width="560" rounded="xl" variant="flat">
          <VAvatar class="mb-4" color="primary" size="56" variant="tonal"><VIcon icon="mdi-cursor-default-click-outline" size="28" /></VAvatar>
          <div class="text-h6 font-weight-bold">Select a block to get started</div>
          <div class="text-body-2 text-medium-emphasis mt-2">Choose an item from the Unit Blocks sidebar to view its content.</div>
        </VCard>
      </section>
    </main>
    </div>
    <template #footer>
      <VAlert v-if="error" class="footer-error" color="error" density="compact" variant="tonal">{{ error }}</VAlert>
    </template>
  </NuxtLayout>
</template>

<style scoped>
.viewer-shell { width: 100%; height: 100%; min-width: 0; min-height: 0; background: #f6f7fb; }
.viewer-sidebar { display: flex; width: 100%; height: 100%; min-height: 0; flex-direction: column; }
.course-title-bar { display: flex; width: 100%; min-width: 0; align-items: center; gap: 14px; padding: 0 24px; }
.course-title-text { min-width: 0; line-height: 1.25; }
.course-title-name { overflow: hidden; font-size: 1rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.course-version-select { flex: none; width: 168px; }
.course-unit-tree { max-height: calc(100vh - 180px); overflow-y: auto; padding: 4px 8px 8px; }
.course-unit-tree :deep(.v-list-item) { min-height: 42px; border-radius: 8px; }
.course-unit-tree :deep(.v-list-item--active) { color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .08); }
.unit-heading { display: flex; min-width: 0; align-items: center; gap: 12px; margin: 12px; padding: 14px; border: 1px solid #e7e9ef; border-radius: 12px; background: rgb(var(--v-theme-surface)); }
.unit-heading-text { flex: 1; min-width: 0; font-size: 14px; }
.unit-heading-text strong { display: block; overflow: hidden; font-size: .9rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.viewer-tree { flex: 1; min-height: 0; overflow: auto; padding: 0 8px 8px; }
.unit-block-list { padding: 4px; }
.unit-block-list :deep(.v-list-item) { min-height: 44px; margin-block: 2px; border-radius: 9px; }
.unit-block-list :deep(.v-list-item--active) { color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .1); }
.viewer-account { display: flex; min-height: 56px; align-items: center; border-top: 1px solid #e7e9ef; padding: 4px 8px; }
.viewer-account :deep(.account-button) { justify-content: flex-start; width: 100%; }
.viewer-main { display: flex; width: 100%; height: 100%; min-width: 0; min-height: 0; flex-direction: column; }
.viewer-content { width: min(100%, 1180px); flex: 1; overflow: auto; margin-inline: auto; padding: 32px clamp(20px, 4vw, 56px) 48px; }
.workspace-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.block-summary-card, .component-card, .empty-components, .workspace-empty { border: 1px solid #e7e9ef; background: rgb(var(--v-theme-surface)); box-shadow: 0 2px 8px #10182808; }
.block-description { max-width: 850px; margin: 0; color: #475467; line-height: 1.7; white-space: pre-line; }
.components-section { margin-top: 28px; }
.component-grid { display: grid; gap: 16px; }
.component-card { overflow: hidden; }
.component-card-content { display: grid; gap: 14px; }
.component-field-label { margin-bottom: 5px; color: #667085; font-size: .75rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.component-value { margin: 0; color: #344054; font-size: .95rem; line-height: 1.7; white-space: pre-line; overflow-wrap: anywhere; }
.component-value-list { padding: 0; }
.component-value-list :deep(.v-list-item) { min-height: 32px; padding-inline: 0; }
.component-value-list :deep(.v-list-item__prepend) { margin-inline-end: 4px; }
.component-loading { display: flex; align-items: center; gap: 12px; padding: 24px; color: #667085; }
.empty-components { color: #344054; }
.workspace-empty { margin-top: 10vh; }

@media (max-width: 900px) {
  .course-version-select { width: 140px; }
  .course-title-bar { gap: 8px; padding-inline: 8px; }
  .viewer-content { padding: 24px 18px 36px; }
}

@media (max-width: 600px) {
  .course-version-select { width: 120px; }
  .course-title-bar { gap: 4px; }
  .course-title-name { max-width: 32vw; font-size: .875rem; }
  .course-title-bar :deep(.v-btn) { min-width: 0; padding-inline: 8px; font-size: .75rem; }
  .workspace-heading { align-items: flex-start; flex-direction: column; }
}
</style>
