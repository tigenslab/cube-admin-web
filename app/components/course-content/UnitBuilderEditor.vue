<script setup lang="ts">
import type { Course } from '~/stores/courses'
import type { CourseResourceItem, UnitBlockComponent } from '~/types/course-resources'
import type { ApiFormSchema } from '~/types/api-form'
import CourseUnitNavigation from '~/components/course-content/CourseUnitNavigation.vue'
import type { CourseUnitNavigationRow } from '~/components/course-content/CourseUnitNavigation.vue'
import { displayCourseUnitCode, displayCourseUnitTitle, unitMatchesCourseLevel } from '~/utils/course-unit-display'
import { displayCourseCode, displayCourseTitle } from '~/utils/course-display'

const props = withDefaults(defineProps<{ mode?: 'edit' | 'view' }>(), { mode: 'edit' })
const route = useRoute()
const router = useRouter()
const courseId = String(route.params.id)
const unitId = computed(() => String(route.params.unitId))
const courses = useCoursesStore()
const unitsApi = useUnitsApi()
const courseUnitsApi = useCourseUnitsApi()
const unitBlocksApi = useUnitBlocksApi()
const unitBlockComponentsApi = useUnitBlockComponentsApi()
const course = useState<Course | null>(`unit-builder-course-${courseId}`, () => null)
const courseUnits = useState<CourseUnitNavigationRow[]>(`unit-builder-course-units-${courseId}`, () => [])
const courseUnitItems = useState<CourseResourceItem[]>(`unit-builder-course-unit-items-${courseId}`, () => [])
const openCourseUnitGroups = useState<string[]>(`unit-builder-open-course-unit-groups-${courseId}`, () => [])
const structureVersion = useState<string | null>(`unit-builder-structure-version-${courseId}`, () => null)
const unit = ref<CourseResourceItem | null>(null)
const blocks = ref<CourseResourceItem[]>([])
const blockComponents = ref<UnitBlockComponent[]>([])
const activeBlockId = ref<string | null>(null)
const componentsLoading = ref(false)
const loading = ref(true)
const saving = ref(false)
const componentSaving = ref(false)
const unitInfoSaving = ref(false)
const error = ref('')
const dialog = ref(false)
const blockFormSchema = ref<ApiFormSchema | null>(null)
const componentFormSchema = ref<ApiFormSchema | null>(null)
const componentFormModel = ref<Partial<Pick<UnitBlockComponent, 'type' | 'content'>>>({})
const unitInfoDialog = ref(false)
const courseStructureDialog = ref(false)
const courseStructureSaving = ref(false)
const courseStructureLoading = ref(false)
const courseStructureError = ref('')
const courseStructureKind = ref<'group' | 'unit'>('group')
const courseUnitMode = ref<'existing' | 'new'>('existing')
const courseStructureParentId = ref<string | null>(null)
const editingCourseGroup = ref<CourseResourceItem | null>(null)
const availableCourseUnits = ref<CourseResourceItem[]>([])
const editingBlock = ref<CourseResourceItem | null>(null)
const form = reactive({ type: 'T:B', parent: '', position: '' as number | string })
const blockForm = reactive({ title: '' })
const unitInfoForm = reactive({ code: '', title: '', level: '' as number | string })
const courseGroupForm = reactive({ title: '' })
const courseUnitForm = reactive({ unit_id: '' })
const newCourseUnitForm = reactive({ code: '', title: '' })
const selectedVersion = computed(() => {
  const value = Number(route.params.version)
  return Number.isInteger(value) && value > 0 ? value : null
})
const editable = computed(() => props.mode === 'edit' && !selectedVersion.value)
const versionSegment = computed(() => selectedVersion.value ? String(selectedVersion.value) : 'current')
const courseRoute = computed(() => `/courses/${courseId}/${versionSegment.value}/dashboard`)
const versionOptions = computed(() => {
  const options = (course.value?.versions || [])
    .slice()
    .sort((a, b) => b.version - a.version)
    .map(item => ({ title: `Version ${item.version}`, value: String(item.version) }))
  if (course.value?.permissions?.update || course.value?.permissions?.change_status) options.unshift({ title: 'Current', value: 'current' })
  return options
})
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
const unlinkedCourseUnits = computed(() => {
  const linked = new Set(flatCourseUnits.value.map(row => row.unit_id).filter((id): id is string => Boolean(id)))
  return availableCourseUnits.value
    .filter(item => !linked.has(item.id)
      && unitMatchesCourseLevel(course.value?.type, course.value?.level, item.level))
    .map(item => ({ title: `${displayCourseUnitCode(course.value?.type, item)} — ${displayCourseUnitTitle(course.value?.type, item)}`, value: item.id }))
})
const courseStructureParentLabel = computed(() => {
  if (!courseStructureParentId.value) return 'Course root'
  return courseUnitItems.value.find(item => item.id === courseStructureParentId.value)?.title || 'Selected group'
})

const orderedBlocks = computed(() => {
  const byParent = new Map<string, CourseResourceItem[]>()
  for (const block of blocks.value) {
    const parentId = block.ancestry?.split('/').filter(Boolean).at(-1) || ''
    const siblings = byParent.get(parentId) || []
    siblings.push(block)
    byParent.set(parentId, siblings)
  }
  for (const siblings of byParent.values()) siblings.sort((a, b) => (a.position || 0) - (b.position || 0))
  const ordered: CourseResourceItem[] = []
  const visited = new Set<string>()
  const addChildren = (parentId: string) => {
    for (const block of byParent.get(parentId) || []) {
      if (visited.has(block.id)) continue
      visited.add(block.id)
      ordered.push(block)
      addChildren(block.id)
    }
  }
  addChildren('')
  return ordered
})
const activeBlock = computed(() => blocks.value.find(block => block.id === activeBlockId.value) || null)
const blockVjsfSchema = computed<ApiFormSchema | null>(() => {
  const title = blockFormSchema.value?.properties?.content?.properties?.title
  return title ? { type: 'object', title: 'Block details', properties: { title } } : null
})
let componentsRequest = 0
let loadRequest = 0

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
    const result = await unitBlockComponentsApi.list(courseId, unitId.value, blockId)
    if (request === componentsRequest) blockComponents.value = result.items
  } catch (cause) {
    if (request === componentsRequest) error.value = getApiErrorMessage(cause, 'Unable to load block components.')
  } finally {
    if (request === componentsRequest) componentsLoading.value = false
  }
})

watch(() => route.params.blockId, (value) => {
  if (typeof value === 'string' && blocks.value.some(block => block.id === value)) {
    activeBlockId.value = value
  }
})

function blockTitle(block: CourseResourceItem) {
  return block.title || String(block.content?.title || block.metadata?.title || 'Untitled block')
}

async function load(reloadStructure = false) {
  const request = ++loadRequest
  loading.value = true
  error.value = ''
  activeBlockId.value = null
  blockComponents.value = []
  try {
    const shouldLoadStructure = reloadStructure || !course.value || structureVersion.value !== versionSegment.value
    const courseData = shouldLoadStructure ? await courses.show(courseId) : course.value!
    if (request !== loadRequest) return
    course.value = courseData
    if (selectedVersion.value) {
      const [courseSnapshot, snapshot] = await Promise.all([
        shouldLoadStructure ? courses.version(courseId, selectedVersion.value) : Promise.resolve(null),
        courses.versionUnit(courseId, selectedVersion.value, unitId.value),
      ])
      if (request !== loadRequest) return
      if (courseSnapshot) {
        setCourseUnits(courseSnapshot.course_units || [], courseSnapshot.units || [])
        structureVersion.value = versionSegment.value
      }
      unit.value = { id: unitId.value, ...snapshot.unit } as CourseResourceItem
      blocks.value = flattenSnapshotBlocks(snapshot.blocks)
    } else {
      const [unitForm, blockData, courseUnitData] = await Promise.all([
        unitsApi.editForm(courseId, unitId.value),
        unitBlocksApi.list(courseId, unitId.value),
        shouldLoadStructure ? courseUnitsApi.list(courseId) : Promise.resolve(null),
      ])
      if (request !== loadRequest) return
      if (courseUnitData) {
        setCourseUnits(courseUnitData.items, courseUnitData.units)
        structureVersion.value = versionSegment.value
      }
      unit.value = { id: unitId.value, ...unitForm.vjsf.model } as CourseResourceItem
      blocks.value = blockData.items
    }
    const requestedBlockId = typeof route.params.blockId === 'string'
      ? route.params.blockId
      : typeof route.query.block === 'string' ? route.query.block : null
    if (requestedBlockId && blocks.value.some(block => block.id === requestedBlockId)) {
      activeBlockId.value = requestedBlockId
    } else if (!blocks.value.some(block => block.id === activeBlockId.value)) {
      activeBlockId.value = blocks.value.find(block => !blocks.value.some(candidate => candidate.ancestry?.split('/').includes(block.id)))?.id || null
    }
    if (activeBlockId.value && route.params.blockId !== activeBlockId.value) {
      await router.replace(blockPath(activeBlockId.value))
    } else if (!activeBlockId.value && route.params.blockId) {
      await router.replace(`/courses/${courseId}/${versionSegment.value}/units/${unitId.value}/edit`)
    }
  } catch (cause) {
    if (request === loadRequest) error.value = getApiErrorMessage(cause, 'Unable to load unit content.')
  } finally {
    if (request === loadRequest) loading.value = false
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

function setCourseUnits(rows: unknown[], unitItems: unknown[] = []) {
  const previousOpenGroups = new Set(openCourseUnitGroups.value)
  const structureWasLoaded = structureVersion.value !== null
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
  courseUnitItems.value = flattened.map(row => ({
    ...row,
    id: String(row.id || ''),
    type: row.type === 'CourseUnit::Group' ? 'G' : row.type === 'CourseUnit::Unit' ? 'U' : String(row.type || ''),
  })).filter(row => row.id)
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
      ancestry: String(row.ancestry || ''),
      position: Number(row.position || 0),
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
  openCourseUnitGroups.value = structureWasLoaded
    ? groupIds.filter(id => previousOpenGroups.has(id))
    : groupIds
}

async function refreshCourseStructure() {
  const result = await courseUnitsApi.list(courseId)
  setCourseUnits(result.items, result.units)
  structureVersion.value = 'current'
}

async function openAddCourseStructure(kind: 'group' | 'unit', parentId: string | null = null) {
  editingCourseGroup.value = null
  courseStructureKind.value = kind
  courseStructureParentId.value = parentId
  courseStructureError.value = ''
  courseGroupForm.title = ''
  courseUnitForm.unit_id = ''
  newCourseUnitForm.code = ''
  newCourseUnitForm.title = ''
  courseUnitMode.value = 'existing'
  availableCourseUnits.value = []
  courseStructureDialog.value = true

  if (kind === 'unit') {
    courseStructureLoading.value = true
    try {
      const result = await unitsApi.list(courseId)
      availableCourseUnits.value = result.items
      courseUnitForm.unit_id = unlinkedCourseUnits.value[0]?.value || ''
      courseUnitMode.value = unlinkedCourseUnits.value.length ? 'existing' : 'new'
    } catch (cause) {
      courseUnitMode.value = 'new'
      courseStructureError.value = getApiErrorMessage(cause, 'Unable to load available units.')
    } finally {
      courseStructureLoading.value = false
    }
  }
}

function editCourseGroup(row: CourseUnitNavigationRow) {
  const group = courseUnitItems.value.find(item => item.id === row.id)
  if (!group) return
  editingCourseGroup.value = group
  courseStructureKind.value = 'group'
  courseStructureParentId.value = group.ancestry?.split('/').filter(Boolean).at(-1) || null
  courseGroupForm.title = group.title || ''
  courseStructureError.value = ''
  courseStructureDialog.value = true
}

function courseStructureAncestry(parentId: string | null) {
  if (!parentId) return ''
  const parent = courseUnitItems.value.find(item => item.id === parentId)
  if (!parent) throw new Error('The parent group could not be found. Reload the course and try again.')
  return [parent.ancestry, parent.id].filter(Boolean).join('/')
}

async function saveCourseStructure() {
  if (courseStructureSaving.value) return
  courseStructureSaving.value = true
  courseStructureError.value = ''
  try {
    if (!course.value?.package_id) throw new Error('This course is not linked to a package.')
    const ancestry = editingCourseGroup.value?.ancestry ?? courseStructureAncestry(courseStructureParentId.value)
    const siblings = courseUnitItems.value.filter(item => (item.ancestry || '') === ancestry)
    const position = editingCourseGroup.value?.position ?? Math.max(0, ...siblings.map(item => item.position || 0)) + 1

    if (courseStructureKind.value === 'group') {
      const savedGroup = await courseUnitsApi.save(courseId, {
        type: 'G',
        ...(!editingCourseGroup.value ? { package_id: course.value.package_id } : {}),
        title: courseGroupForm.title,
        ancestry,
        position,
      }, editingCourseGroup.value?.id)
      courseStructureDialog.value = false
      await refreshCourseStructure()
      if (!editingCourseGroup.value) {
        openCourseUnitGroups.value = [...new Set([...openCourseUnitGroups.value, savedGroup.id])]
      }
    } else {
      const unitId = courseUnitMode.value === 'new'
        ? (await unitsApi.save(courseId, {
            package_id: course.value.package_id,
            code: newCourseUnitForm.code,
            title: newCourseUnitForm.title,
            ...(course.value.type === 'SCH:V9' ? { level: course.value.level } : {}),
            content: {},
          })).id
        : courseUnitForm.unit_id

      await courseUnitsApi.save(courseId, {
        type: 'U',
        package_id: course.value.package_id,
        unit_id: unitId,
        ancestry,
        position,
      })
      courseStructureDialog.value = false
      await refreshCourseStructure()
    }
  } catch (cause) {
    courseStructureError.value = getApiErrorMessage(cause, 'Unable to save the course structure.')
  } finally {
    courseStructureSaving.value = false
  }
}

async function removeCourseStructureItem(row: CourseUnitNavigationRow) {
  const item = courseUnitItems.value.find(candidate => candidate.id === row.id)
  if (!item) return
  const isGroup = row.type === 'G'
  const label = isGroup ? item.title || 'this group and its contents' : 'this unit from the course'
  if (!confirm(`Remove ${label}?${isGroup ? ' Its nested groups and unit links will also be removed from this course.' : ''}`)) return

  try {
    if (isGroup) {
      const descendants = courseUnitItems.value
        .filter(candidate => candidate.ancestry?.split('/').filter(Boolean).includes(item.id))
        .sort((a, b) => (b.ancestry?.split('/').filter(Boolean).length || 0) - (a.ancestry?.split('/').filter(Boolean).length || 0))
      for (const descendant of descendants) await courseUnitsApi.remove(courseId, descendant.id)
    }
    await courseUnitsApi.remove(courseId, item.id)
    await refreshCourseStructure()
    if (!flatCourseUnits.value.some(unitRow => unitRow.unit_id === unitId.value)) {
      const nextUnitId = flatCourseUnits.value[0]?.unit_id
      await router.replace(nextUnitId
        ? `/courses/${encodeURIComponent(courseId)}/${versionSegment.value}/units/${encodeURIComponent(nextUnitId)}/edit`
        : courseRoute.value)
    }
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to remove this course item.')
  }
}

function selectCourseUnit(nextUnitId: string) {
  if (nextUnitId !== unitId.value) router.push(`/courses/${encodeURIComponent(courseId)}/${versionSegment.value}/units/${encodeURIComponent(nextUnitId)}/edit`)
}

function navigateToCourseUnit(nextUnitId: string) {
  if (nextUnitId && nextUnitId !== unitId.value) {
    router.push(`/courses/${encodeURIComponent(courseId)}/${versionSegment.value}/units/${encodeURIComponent(nextUnitId)}/edit`)
  }
}

async function switchVersion(value: string | number | null) {
  const segment = String(value || '')
  if (!segment || segment === versionSegment.value) return
  await router.push(`/courses/${encodeURIComponent(courseId)}/${segment}/units/${encodeURIComponent(unitId.value)}/edit`)
}

async function openBlockEditor(block: CourseResourceItem | null = null, defaults: { type?: string; parent?: string; title?: string } = {}) {
  if (!blockFormSchema.value) {
    try {
      const { vjsf } = await unitBlocksApi.newForm(courseId, unitId.value)
      blockFormSchema.value = vjsf.schema
    } catch (cause) {
      error.value = getApiErrorMessage(cause, 'Unable to load the block form.')
      return
    }
  }
  editingBlock.value = block
  Object.assign(form, {
    type: block?.type || defaults.type || 'T:B',
    parent: block?.ancestry ?? defaults.parent ?? '',
    position: block?.position ?? '',
  })
  blockForm.title = String(block?.content?.title ?? block?.metadata?.title ?? block?.title ?? defaults.title ?? '')
  dialog.value = true
}

function addBlockSubtype(kind: 'Theory' | 'Assessment', subtype: 'Group' | 'Section', parent?: CourseResourceItem) {
  const type = kind === 'Theory'
    ? subtype === 'Group' ? 'T:G' : 'T:B'
    : subtype === 'Group' ? 'A:G' : 'A:B'
  const parentPath = parent
    ? [parent.ancestry, parent.id].filter(Boolean).join('/')
    : ''
  const title = subtype === 'Group' && !parent ? kind : subtype
  openBlockEditor(null, { type, title, parent: parentPath })
}

function openUnitInfo() {
  unitInfoForm.code = unit.value?.code || ''
  unitInfoForm.title = unit.value?.title || ''
  unitInfoForm.level = course.value?.type === 'SCH:V9' ? course.value.level ?? '' : unit.value?.level ?? ''
  unitInfoDialog.value = true
}

async function saveUnitInfo() {
  if (!unit.value || unitInfoSaving.value || !unitInfoForm.code.trim() || !unitInfoForm.title.trim()) return
  unitInfoSaving.value = true
  error.value = ''
  try {
    unit.value = await unitsApi.save(courseId, {
      type: unit.value.type,
      code: unitInfoForm.code.trim(),
      title: unitInfoForm.title.trim(),
      ...(unit.value.type === 'SCH:V9' && unitInfoForm.level !== '' ? { level: Number(unitInfoForm.level) } : {}),
      content: unit.value.content,
    }, unitId.value)
    unitInfoDialog.value = false
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to update unit information.')
  } finally {
    unitInfoSaving.value = false
  }
}

function isBlockGroup(block: CourseResourceItem) {
  return ['T:G', 'A:G'].includes(block.type)
}

function groupCategory(block: CourseResourceItem): 'Theory' | 'Assessment' | null {
  if (['T:G', 'T:B'].includes(block.type)) return 'Theory'
  if (['A:G', 'A:B'].includes(block.type)) return 'Assessment'
  const ancestors = block.ancestry?.split('/').filter(Boolean).reverse() || []
  for (const ancestorId of ancestors) {
    const ancestor = blocks.value.find(candidate => candidate.id === ancestorId)
    if (['T:G', 'T:B'].includes(ancestor?.type || '')) return 'Theory'
    if (['A:G', 'A:B'].includes(ancestor?.type || '')) return 'Assessment'
  }
  return null
}

function addGroupSection(block: CourseResourceItem) {
  const category = groupCategory(block)
  if (category) addBlockSubtype(category, 'Section', block)
}

function addChildGroup(block: CourseResourceItem) {
  const category = groupCategory(block)
  if (category) addBlockSubtype(category, 'Group', block)
}

function blockIcon(block: CourseResourceItem) {
  if (['T:G', 'A:G'].includes(block.type)) return 'mdi-folder-outline'
  if (['T:B', 'A:B'].includes(block.type)) return 'mdi-bookmark-outline'
  return String(block.merged_content?.icon || 'mdi-book-outline')
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

function blockChildCount(block: CourseResourceItem) {
  return blocks.value.filter(candidate => candidate.ancestry?.split('/').filter(Boolean).at(-1) === block.id).length
}

function blockPath(blockId: string) {
  return `/courses/${encodeURIComponent(courseId)}/${versionSegment.value}/units/${encodeURIComponent(unitId.value)}/${props.mode}/blocks/${encodeURIComponent(blockId)}`
}

function selectBlock(blockId: string) {
  activeBlockId.value = blockId
  if (route.params.blockId !== blockId) router.push(blockPath(blockId))
}

async function saveBlock() {
  if (saving.value || !blockForm.title.trim()) return
  saving.value = true
  error.value = ''
  try {
    const data = {
      type: form.type,
      ancestry: form.parent,
      content: { ...editingBlock.value?.content, ...(blockForm.title.trim() ? { title: blockForm.title.trim() } : {}) },
      ...(form.position !== '' ? { position: Number(form.position) } : {}),
    }
    const saved = await unitBlocksApi.save(courseId, unitId.value, data, editingBlock.value?.id)
    dialog.value = false
    await load()
    selectBlock(saved.id)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to save block.')
  } finally {
    saving.value = false
  }
}

async function deleteBlock(block: CourseResourceItem) {
  if (!confirm(`Delete “${blockTitle(block)}”?`)) return
  try {
    await unitBlocksApi.remove(courseId, unitId.value, block.id)
    if (activeBlockId.value === block.id) activeBlockId.value = null
    await load()
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to delete block.')
  }
}

async function addComponent(type: string, variant: string) {
  const blockId = activeBlockId.value
  if (!blockId || !activeBlock.value || isBlockGroup(activeBlock.value) || componentSaving.value) return
  componentSaving.value = true
  error.value = ''
  try {
    if (!componentFormSchema.value) {
      const { vjsf } = await unitBlockComponentsApi.newForm(courseId, unitId.value, blockId)
      componentFormSchema.value = vjsf.schema
      componentFormModel.value = vjsf.model
    }
    if (!componentFormSchema.value.properties?.type?.enum?.includes(type)) throw new Error('This component type is not available.')
    const { item } = await unitBlockComponentsApi.save(courseId, unitId.value, blockId, {
      ...componentFormModel.value,
      type,
      content: { ...(componentFormModel.value.content || {}), variant, list: [{}] },
    })
    blockComponents.value = [...blockComponents.value, item]
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to add component.')
  } finally {
    componentSaving.value = false
  }
}

onMounted(() => load())
watch(
  () => [route.params.unitId, route.params.version] as const,
  ([unitParam, versionParam], [previousUnitParam, previousVersionParam]) => {
    if (unitParam !== previousUnitParam || versionParam !== previousVersionParam) {
      load(versionParam !== previousVersionParam)
    }
  },
)
</script>

<template>
  <NuxtLayout name="unit-builder">
    <template #course-title>
      <div class="course-title-bar">
        <VBtn aria-label="Back to course dashboard" icon="mdi-arrow-left" :to="courseRoute" variant="text" />
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

    <template #course-structure-actions>
      <VMenu v-if="editable" location="bottom end">
        <template #activator="{ props: menuProps }">
          <VBtn v-bind="menuProps" aria-label="Add to course" density="compact" icon="mdi-plus" size="small" variant="text" @click.stop />
        </template>
        <VList density="comfortable" min-width="190">
          <VListItem prepend-icon="mdi-folder-plus-outline" title="Add group" @click="openAddCourseStructure('group')" />
          <VListItem prepend-icon="mdi-book-plus-outline" title="Add unit" @click="openAddCourseStructure('unit')" />
        </VList>
      </VMenu>
    </template>

    <template #course-units>
      <VList v-if="courseUnitCount" v-model:opened="openCourseUnitGroups" class="course-unit-tree" density="compact" nav>
        <CourseUnitNavigation
          :rows="courseUnits"
          :selected-unit-id="unitId"
          :course-type="course?.type"
          :editable="editable"
          @select="selectCourseUnit"
          @add-group="openAddCourseStructure('group', $event)"
          @add-unit="openAddCourseStructure('unit', $event)"
          @edit-group="editCourseGroup"
          @remove="removeCourseStructureItem"
        />
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
        @click="navigateToCourseUnit(row.unit_id!)"
      />
    </template>

    <template #sidebar>
    <aside class="builder-sidebar">
      <div class="unit-heading">
        <VIcon color="primary" icon="mdi-book-open-page-variant-outline" size="22" />
        <div class="unit-heading-text">
          <div class="text-caption text-medium-emphasis">{{ displayCourseUnitCode(course?.type, unit || {}) || 'Unit' }}</div>
          <strong>{{ displayCourseUnitTitle(course?.type, unit || {}) }}</strong>
        </div>
        <VMenu location="end">
          <template #activator="{ props: menuProps }">
            <VBtn v-bind="menuProps" aria-label="Unit actions" icon="mdi-dots-vertical" variant="text" />
          </template>
          <VList v-if="editable" density="comfortable" min-width="250">
            <VListItem prepend-icon="mdi-eye-outline" title="View unit" :to="`/courses/${courseId}/${versionSegment}/units/${unitId}/view`" />
            <VDivider class="my-1" />
            <VListItem prepend-icon="mdi-pencil-outline" title="Edit unit Info" @click="openUnitInfo" />
            <VDivider class="my-1" />
            <VMenu location="end" open-on-hover>
              <template #activator="{ props: submenuProps }">
                <VListItem v-bind="submenuProps" prepend-icon="mdi-book-plus-outline" append-icon="mdi-chevron-right" title="Add Theory" />
              </template>
              <VList density="comfortable" min-width="180">
                <VListItem prepend-icon="mdi-folder-plus-outline" title="Group" @click="addBlockSubtype('Theory', 'Group')" />
                <VListItem prepend-icon="mdi-bookmark-plus-outline" title="Section" @click="addBlockSubtype('Theory', 'Section')" />
              </VList>
            </VMenu>
            <VMenu location="end" open-on-hover>
              <template #activator="{ props: submenuProps }">
                <VListItem v-bind="submenuProps" prepend-icon="mdi-comment-question-outline" append-icon="mdi-chevron-right" title="Add Assessment" />
              </template>
              <VList density="comfortable" min-width="180">
                <VListItem prepend-icon="mdi-folder-plus-outline" title="Group" @click="addBlockSubtype('Assessment', 'Group')" />
                <VListItem prepend-icon="mdi-bookmark-plus-outline" title="Section" @click="addBlockSubtype('Assessment', 'Section')" />
              </VList>
            </VMenu>
          </VList>
          <VList v-else density="comfortable" min-width="220">
            <VListItem prepend-icon="mdi-arrow-left" title="Course dashboard" :to="courseRoute" />
          </VList>
        </VMenu>
      </div>

      <VProgressLinear v-if="loading" color="primary" indeterminate />

      <div class="block-navigation">
        <div class="px-4 pt-3 pb-1 text-overline text-medium-emphasis">UNIT BLOCKS</div>
        <div v-if="!loading && !orderedBlocks.length" class="pa-5 text-body-2 text-medium-emphasis">No unit blocks yet. Add a block below.</div>
        <VList v-else density="comfortable" nav>
          <VListItem
            v-for="block in orderedBlocks"
            :key="block.id"
            :active="activeBlockId === block.id"
            :title="blockTitle(block)"
            :subtitle="isBlockGroup(block) ? String(blockChildCount(block)) : String(block.position || '—')"
            :prepend-icon="blockIcon(block)"
            :style="{ paddingLeft: `${16 + (block.ancestry?.split('/').filter(Boolean).length || 0) * 20}px` }"
            @click="selectBlock(block.id)"
          >
            <template #append>
              <VMenu v-if="editable" location="end">
                <template #activator="{ props: menuProps }">
                  <VBtn v-bind="menuProps" aria-label="Block actions" density="compact" icon="mdi-dots-vertical" size="small" variant="text" @click.stop />
                </template>
                <VList density="comfortable" min-width="210">
                  <template v-if="isBlockGroup(block)">
                    <VListItem
                      v-if="groupCategory(block)"
                      prepend-icon="mdi-folder-plus-outline"
                      title="Add Group"
                      @click="addChildGroup(block)"
                    />
                    <VListItem
                      v-if="groupCategory(block)"
                      :prepend-icon="groupCategory(block) === 'Theory' ? 'mdi-bookmark-plus-outline' : 'mdi-clipboard-plus-outline'"
                      title="Add Section"
                      @click="addGroupSection(block)"
                    />
                    <VDivider v-if="groupCategory(block)" class="my-1" />
                  </template>
                  <VListItem prepend-icon="mdi-pencil-outline" title="Edit" @click="openBlockEditor(block)" />
                  <VListItem prepend-icon="mdi-delete-outline" title="Delete" @click="deleteBlock(block)" />
                </VList>
              </VMenu>
            </template>
          </VListItem>
        </VList>
      </div>

      <div class="sidebar-account">
        <SessionAccountMenu />
      </div>
    </aside>
    </template>

    <div class="builder-shell">
    <main class="builder-workspace">
      <section class="builder-content">
        <template v-if="activeBlock">
          <div class="workspace-heading">
            <div>
              <div class="text-overline text-medium-emphasis">{{ displayCourseUnitCode(course?.type, unit || {}) || 'Course unit' }}</div>
              <h1 class="text-h4 font-weight-bold">{{ blockTitle(activeBlock) }}</h1>
            </div>
            <div class="d-flex align-center ga-3">
              <VChip color="primary" prepend-icon="mdi-shape-outline" variant="tonal">{{ activeBlock.type }}</VChip>
              <VBtn v-if="editable" prepend-icon="mdi-pencil-outline" variant="tonal" @click="openBlockEditor(activeBlock)">Edit block</VBtn>
            </div>
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
              <p v-if="activeBlock.content?.description" class="block-description text-body-1">{{ activeBlock.content.description }}</p>
              <div v-else class="text-body-2 text-medium-emphasis">This block has no overview text.</div>
            </VCardText>
          </VCard>
          <div class="components-section">
            <div class="d-flex align-end justify-space-between mb-4">
              <div>
                <h2 class="text-h6 font-weight-bold">Block content</h2>
                <div class="text-body-2 text-medium-emphasis">{{ blockComponents.length }} {{ blockComponents.length === 1 ? 'component' : 'components' }}</div>
              </div>
              <VMenu v-if="editable" location="bottom">
                <template #activator="{ props: menuProps }">
                  <VBtn v-bind="menuProps" prepend-icon="mdi-plus" :loading="componentSaving" :disabled="isBlockGroup(activeBlock)" variant="tonal">Add component</VBtn>
                </template>
                <VList density="comfortable" min-width="220">
                  <VListItem prepend-icon="mdi-text" title="Text" @click="addComponent('T:TXT', 'paragraph')" />
                  <VListItem prepend-icon="mdi-format-list-bulleted" title="List" @click="addComponent('T:LST', 'list')" />
                  <VListItem prepend-icon="mdi-help-circle-outline" title="Theory question" @click="addComponent('T:MCQ', 'list')" />
                  <VListItem prepend-icon="mdi-tab" title="Tab" @click="addComponent('T:TAB', 'tab')" />
                  <VListItem prepend-icon="mdi-image-outline" title="Image" @click="addComponent('T:IMG', 'default')" />
                  <VListItem prepend-icon="mdi-video-outline" title="Video" @click="addComponent('T:VID', 'default')" />
                  <VDivider class="my-1" />
                  <VListItem prepend-icon="mdi-help-circle-outline" title="Multiple choice" @click="addComponent('A:MCQ', 'list')" />
                  <VListItem prepend-icon="mdi-text-box-outline" title="Essay" @click="addComponent('A:ESS', 'default')" />
                  <VListItem prepend-icon="mdi-checkbox-marked-outline" title="True or false" @click="addComponent('A:TRF', 'default')" />
                  <VListItem prepend-icon="mdi-drag" title="Drag and drop" @click="addComponent('A:DND', 'default')" />
                </VList>
              </VMenu>
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
        <VCard v-else-if="!orderedBlocks.length" class="workspace-empty mx-auto pa-10 text-center" max-width="560" rounded="xl" variant="flat">
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

  <VDialog v-if="editable" v-model="dialog" max-width="560">
    <VCard rounded="xl">
      <VCardTitle class="pa-6 pb-2">{{ editingBlock ? 'Edit block' : 'Add content block' }}</VCardTitle>
      <VCardText class="pa-6 pt-2">
        <FormsVjsfForm v-if="blockVjsfSchema" v-model="blockForm" :schema="blockVjsfSchema" />
      </VCardText>
      <VCardActions class="pa-6 pt-0">
        <VSpacer />
        <VBtn variant="text" @click="dialog = false">Cancel</VBtn>
        <VBtn color="primary" :loading="saving" @click="saveBlock">Save block</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-if="editable" v-model="unitInfoDialog" max-width="560">
    <VCard rounded="xl">
      <VCardTitle class="pa-6 pb-2">Edit unit Info</VCardTitle>
      <VCardText class="pa-6 pt-2">
        <VTextField v-model="unitInfoForm.code" class="mb-3" label="Unit code" required />
        <VTextField v-model="unitInfoForm.title" label="Unit title" required />
        <VTextField v-if="unit?.type === 'SCH:V9'" v-model.number="unitInfoForm.level" class="mt-3" label="Year level" min="1" readonly type="number" />
      </VCardText>
      <VCardActions class="pa-6 pt-0">
        <VSpacer />
        <VBtn :disabled="unitInfoSaving" variant="text" @click="unitInfoDialog = false">Cancel</VBtn>
        <VBtn color="primary" :loading="unitInfoSaving" @click="saveUnitInfo">Save changes</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-if="editable" v-model="courseStructureDialog" max-width="560">
    <VCard rounded="xl">
      <VCardTitle class="pa-6 pb-2">
        {{ editingCourseGroup ? 'Edit group' : courseStructureKind === 'group' ? 'Add group' : 'Add unit' }}
      </VCardTitle>
      <VCardText class="pa-6 pt-2">
        <VAlert v-if="courseStructureError" class="mb-4" color="error" density="compact" variant="tonal">{{ courseStructureError }}</VAlert>
        <div class="mb-4 text-body-2 text-medium-emphasis">{{ editingCourseGroup ? 'Group location:' : 'Adding under:' }} <strong>{{ courseStructureParentLabel }}</strong></div>
        <VProgressLinear v-if="courseStructureLoading" class="mb-4" color="primary" indeterminate />
        <VTextField v-if="courseStructureKind === 'group'" v-model="courseGroupForm.title" label="Group name" />
        <template v-else>
          <VRadioGroup v-model="courseUnitMode" class="mb-2" inline>
            <VRadio label="Select existing unit" value="existing" :disabled="!unlinkedCourseUnits.length" />
            <VRadio label="Create new unit" value="new" />
          </VRadioGroup>
          <VSelect
            v-if="courseUnitMode === 'existing'"
            v-model="courseUnitForm.unit_id"
            :items="unlinkedCourseUnits"
            item-title="title"
            item-value="value"
            label="Unit"
          />
          <template v-else>
            <VTextField v-model="newCourseUnitForm.code" class="mb-3" label="Unit code" />
            <VTextField v-model="newCourseUnitForm.title" label="Unit title" />
          </template>
        </template>
      </VCardText>
      <VCardActions class="pa-6 pt-0">
        <VSpacer />
        <VBtn :disabled="courseStructureSaving" variant="text" @click="courseStructureDialog = false">Cancel</VBtn>
        <VBtn color="primary" :disabled="courseStructureLoading" :loading="courseStructureSaving" @click="saveCourseStructure">
          {{ editingCourseGroup ? 'Save group' : 'Add' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.builder-shell { width: 100%; height: 100%; min-width: 0; min-height: 0; background: #f6f7fb; }
.builder-sidebar { display: flex; width: 100%; height: 100%; min-height: 0; flex-direction: column; border-right: 1px solid #ddd; }
.course-title-bar { display: flex; width: 100%; min-width: 0; align-items: center; gap: 14px; padding: 0 24px; }
.course-title-text { min-width: 0; line-height: 1.25; }
.course-title-name { overflow: hidden; font-size: 1rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.course-version-select { flex: none; width: 168px; }
.course-unit-tree { max-height: calc(100vh - 180px); overflow-y: auto; padding: 4px 8px 8px; }
.course-unit-tree :deep(.v-list-item) { min-height: 42px; border-radius: 8px; }
.course-unit-tree :deep(.v-list-item--active) { color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .08); }
.unit-heading { display: flex; min-width: 0; align-items: center; gap: 12px; margin: 12px; padding: 14px; border: 1px solid #e7e9ef; border-radius: 12px; background: rgb(var(--v-theme-surface)); }
.unit-heading-text { flex: 1; min-width: 0; font-size: 14px; }
.unit-heading-text strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.block-navigation { flex: 1; overflow: auto; padding-bottom: 12px; }
.block-navigation :deep(.v-list-item) { min-height: 44px; margin-block: 2px; border-radius: 9px; }
.block-navigation :deep(.v-list-item--active) { color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .1); }
.sidebar-account { display: flex; min-height: 56px; align-items: center; border-top: 1px solid #eee; padding: 4px 8px; }
.sidebar-account :deep(.account-button) { justify-content: flex-start; width: 100%; }
.builder-workspace { display: flex; width: 100%; height: 100%; min-width: 0; min-height: 0; flex-direction: column; }
.builder-content { width: min(100%, 1180px); flex: 1; overflow: auto; margin-inline: auto; padding: 32px clamp(20px, 4vw, 56px) 48px; }
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
.workspace-empty { margin-top: 10vh; }

@media (max-width: 900px) {
  .course-version-select { width: 140px; }
  .course-title-bar { gap: 8px; padding-inline: 8px; }
  .builder-content { padding: 24px 18px 36px; }
}

@media (max-width: 600px) {
  .course-version-select { width: 120px; }
  .course-title-bar { gap: 4px; }
  .course-title-name { max-width: 32vw; font-size: .875rem; }
  .course-title-bar :deep(.v-btn) { min-width: 0; padding-inline: 8px; font-size: .75rem; }
  .workspace-heading { align-items: flex-start; flex-direction: column; }
}
</style>
