<script setup lang="ts">
import type { Course } from '~/stores/courses'
import type { CourseResourceItem } from '~/types/course-resources'
import type { ApiFormSchema } from '~/types/api-form'
import type { CatalogueBlockTitle, CatalogueCourseContent, CatalogueOutlineRow, CatalogueUnitSnapshot } from '~/stores/catalogue'
import CatalogueOutline from '~/components/CatalogueOutline.vue'
import { displayCourseUnitCode, displayCourseUnitTitle } from '~/utils/course-unit-display'
const props = defineProps<{ embedded?: boolean; courseId?: string }>()
const emit = defineEmits<{
  courseUpdated: [course: Course]
  contentUpdated: []
}>()
const route = useRoute()
const coursesStore = useCoursesStore()
const courseEdit = useCourseEditModel()
const courseUnitsApi = useCourseUnitsStore()
const unitsApi = useUnitsStore()
const unitBlocksApi = useUnitBlocksStore()
const catalogueApi = useCatalogueStore()
const course = ref<Course | null>(null)
const units = ref<CourseResourceItem[]>([])
const outline = ref<CourseResourceItem[]>([])
const search = ref('')
const loadingUnits = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)
const detailsDialog = ref(false)
const addDialog = ref(false)
const adding = ref(false)
const addError = ref('')
const addFormLoading = ref(false)
const courseUnitFormSchema = ref<ApiFormSchema | null>(null)
const unitCreateFormSchema = ref<ApiFormSchema | null>(null)
const addKind = ref<'group' | 'unit'>('unit')
const addUnitMode = ref<'existing' | 'create'>('existing')
const groupForm = reactive({ title: '' })
const existingUnitForm = reactive({ unit_id: '' })
const newUnitForm = reactive({ code: '', title: '' })
const editingGroup = ref<CourseResourceItem | null>(null)
const addParentGroupId = ref<string | null>(null)
const courseId = props.courseId || String(route.params.id)

const outlineTree = computed(() => {
  const unitById = new Map(units.value.map(unit => [unit.id, unit]))
  const nodes = new Map<string, CatalogueOutlineRow>()
  const roots: CatalogueOutlineRow[] = []
  for (const item of outline.value) {
    const isUnit = item.type === 'U' || item.type === 'CourseUnit::Unit' || Boolean(item.unit_id)
    const unit = item.unit_id ? unitById.get(item.unit_id) : undefined
    nodes.set(item.id, {
      ...item,
      type: isUnit ? 'U' : 'G',
      title: isUnit ? unit?.title || item.title || 'Untitled unit' : item.title || item.code || 'Untitled group',
      code: isUnit ? unit?.code || item.code : item.code,
      children: [],
    })
  }
  for (const item of outline.value) {
    const node = nodes.get(item.id)
    if (!node) continue
    const parentId = item.ancestry?.split('/').filter(Boolean).at(-1)
    const parent = parentId ? nodes.get(parentId) : undefined
    if (parent?.type === 'G') parent.children!.push(node)
    else roots.push(node)
  }
  const query = search.value.trim().toLowerCase()
  const filterRows = (rows: CatalogueOutlineRow[]): CatalogueOutlineRow[] => rows.flatMap((row) => {
    if (row.type === 'U') {
      const unit = row.unit_id ? unitById.get(row.unit_id) : undefined
      return !query || `${row.code || unit?.code || ''} ${row.title || unit?.title || ''}`.toLowerCase().includes(query) ? [row] : []
    }
    const children = filterRows(row.children || [])
    return !query || children.length || row.title?.toLowerCase().includes(query) ? [{ ...row, children }] : []
  })
  return filterRows(roots)
})

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

const outlineUnits = computed<CatalogueUnitSnapshot[]>(() => units.value.map(unit => ({
  unit_id: unit.id,
  version: 0,
  unit: { id: unit.id, code: unit.code, title: unit.title },
  blocks: (unit as CourseResourceItem & { blocks?: CatalogueBlockTitle[] }).blocks || [],
})))
const catalogueUnitIds = computed(() => new Set(units.value.filter(unit => unit.catalogue_source).map(unit => unit.id)))

function flattenCatalogueOutline(rows: CatalogueOutlineRow[], ancestry = '', result: CourseResourceItem[] = []) {
  for (const row of rows) {
    const type = row.unit_id || row.type === 'CourseUnit::Unit' ? 'U' : row.type === 'CourseUnit::Group' ? 'G' : row.type
    const rowAncestry = String(row.ancestry ?? ancestry)
    result.push({ ...row, type, ancestry: rowAncestry, catalogue_source: true })
    const childAncestry = type === 'G' ? [rowAncestry, row.id].filter(Boolean).join('/') : rowAncestry
    flattenCatalogueOutline(row.children || [], childAncestry, result)
  }
  return result
}
const availableUnits = computed(() => {
  const linked = new Set(outline.value.filter(item => item.type === 'U').map(item => item.unit_id))
  return units.value.filter(unit => !linked.has(unit.id)).map(unit => ({
    title: `${displayCourseUnitCode(unit)} — ${displayCourseUnitTitle(unit)}`,
    value: unit.id,
  }))
})
const addParentLabel = computed(() => {
  if (!addParentGroupId.value) return 'Course root'
  const parent = outline.value.find(item => item.id === addParentGroupId.value)
  return parent?.title || parent?.code || 'Selected group'
})
const addVjsfSchema = computed<ApiFormSchema | null>(() => {
  if (addKind.value === 'group') {
    const title = courseUnitFormSchema.value?.properties?.title
    return title ? { type: 'object', title: 'Group details', properties: { title } } : null
  }
  if (addUnitMode.value === 'existing') {
    const unitId = courseUnitFormSchema.value?.properties?.unit_id
    return unitId ? {
      type: 'object',
      title: 'Select a unit',
      properties: {
        unit_id: {
          ...unitId,
          oneOf: availableUnits.value.map(({ title, value }) => ({ const: value, title })),
        },
      },
    } : null
  }
  const code = unitCreateFormSchema.value?.properties?.code
  const title = unitCreateFormSchema.value?.properties?.title
  return code && title ? {
    type: 'object',
    title: 'New unit details',
    properties: { code, title },
  } : null
})
async function deleteOutlineItem(item: CourseResourceItem) {
  const isGroup = item.type === 'G'
  const label = isGroup ? item.title || 'this group and its contents' : 'this unit from the course'
  if (!confirm(`Remove ${label}?${isGroup ? ' Its nested groups and unit links will also be removed from this course.' : ''}`)) return
  try {
    if (isGroup) {
      const descendants = outline.value
        .filter(candidate => candidate.ancestry?.split('/').filter(Boolean).includes(item.id))
        .sort((a, b) => (b.ancestry?.split('/').filter(Boolean).length || 0) - (a.ancestry?.split('/').filter(Boolean).length || 0))
      for (const descendant of descendants) await courseUnitsApi.remove(courseId, descendant.id)
    }
    await courseUnitsApi.remove(courseId, item.id)
    await loadUnits()
    emit('contentUpdated')
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
    const [unitData, outlineData, catalogueData] = await Promise.all([
      unitsApi.list(courseId),
      courseUnitsApi.list(courseId),
      course.value?.catalogue_course_id ? catalogueApi.course(course.value.catalogue_course_id) : Promise.resolve(null),
    ])
    const allUnits = [...unitData.items]
    for (const referencedUnit of outlineData.units || []) {
      if (!allUnits.some(unit => unit.id === referencedUnit.id)) allUnits.push(referencedUnit)
    }
    const localUnits = await Promise.all(allUnits.map(async (unit) => {
      const { items } = await unitBlocksApi.list(courseId, unit.id).catch(() => ({ items: [] }))
      return { ...unit, blocks: blockTitleTree(items) }
    }))
    const catalogueUnits: CourseResourceItem[] = (catalogueData?.units || []).map(reference => ({
      ...reference.unit,
      id: reference.unit.id || reference.unit_id,
      version: reference.version,
      type: 'U',
      blocks: reference.blocks,
      catalogue_source: true,
    }))
    units.value = [...catalogueUnits, ...localUnits]
    outline.value = [
      ...(catalogueData ? flattenCatalogueOutline(catalogueData.course_units) : []),
      ...outlineData.items,
    ]
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
    if (!await courseEdit.load(course.value)) {
      error.value = courseEdit.error.value
    } else if (!course.value.package_id) {
      const packageId = courseEdit.form.value?.model.package_id
      if (packageId) course.value.package_id = String(packageId)
    }
    await loadUnits()
  }
})

async function submit() {
  if (!course.value || !courseEdit.form.value) return
  submitting.value = true
  error.value = null
  try {
    const updated = await courseEdit.save()
    if (!updated) {
      error.value = courseEdit.error.value
      return
    }
    course.value = updated
    emit('courseUpdated', updated)
    detailsDialog.value = false
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to update course.')
  } finally {
    submitting.value = false
  }
}

async function loadAddFormSchemas() {
  addFormLoading.value = true
  addError.value = ''
  try {
    if (editingGroup.value) {
      const { vjsf } = await courseUnitsApi.editForm(courseId, editingGroup.value.id)
      courseUnitFormSchema.value = vjsf.schema
      unitCreateFormSchema.value = null
      groupForm.title = String(vjsf.model.title || '')
      return
    }
    const [courseUnitForm, unitForm] = await Promise.all([
      courseUnitsApi.newForm(courseId),
      unitsApi.newForm(courseId),
    ])
    courseUnitFormSchema.value = courseUnitForm.vjsf.schema
    unitCreateFormSchema.value = unitForm.vjsf.schema
    groupForm.title = String(courseUnitForm.vjsf.model.title || '')
    existingUnitForm.unit_id = addUnitIdForNewForm()
    newUnitForm.code = String(unitForm.vjsf.model.code || '')
    newUnitForm.title = String(unitForm.vjsf.model.title || '')
  } catch (cause) {
    addError.value = getApiErrorMessage(cause, 'Unable to load the create form.')
  } finally {
    addFormLoading.value = false
  }
}

function addUnitIdForNewForm() {
  return availableUnits.value[0]?.value || ''
}

async function openAddDialog() {
  editingGroup.value = null
  addKind.value = 'unit'
  addUnitMode.value = availableUnits.value.length ? 'existing' : 'create'
  Object.assign(groupForm, { title: '' })
  Object.assign(existingUnitForm, { unit_id: '' })
  Object.assign(newUnitForm, { code: '', title: '' })
  addParentGroupId.value = null
  addError.value = ''
  addDialog.value = true
  await loadAddFormSchemas()
}

async function openAddUnitDialog(groupId?: string, kind: 'group' | 'unit' = 'unit') {
  editingGroup.value = null
  const group = groupId ? outline.value.find(item => item.id === groupId) : undefined
  addKind.value = kind
  addUnitMode.value = availableUnits.value.length ? 'existing' : 'create'
  Object.assign(groupForm, { title: '' })
  Object.assign(existingUnitForm, { unit_id: '' })
  Object.assign(newUnitForm, { code: '', title: '' })
  addParentGroupId.value = group?.id || null
  addError.value = ''
  addDialog.value = true
  await loadAddFormSchemas()
}

async function editGroup(groupId: string) {
  editingGroup.value = outline.value.find(item => item.id === groupId) || null
  if (!editingGroup.value) return
  addKind.value = 'group'
  groupForm.title = editingGroup.value.title || ''
  addParentGroupId.value = editingGroup.value.ancestry?.split('/').filter(Boolean).at(-1) || null
  addError.value = ''
  addDialog.value = true
  await loadAddFormSchemas()
  groupForm.title = editingGroup.value?.title || ''
}

async function addToCourse() {
  if (adding.value) return
  if (addKind.value === 'group' && !groupForm.title.trim()) {
    addError.value = 'Enter a group name.'
    return
  }
  if (addKind.value === 'unit' && addUnitMode.value === 'existing' && !existingUnitForm.unit_id) {
    addError.value = 'Select a unit to add.'
    return
  }
  if (addKind.value === 'unit' && addUnitMode.value === 'create' && (!newUnitForm.code.trim() || !newUnitForm.title.trim())) {
    addError.value = 'Enter a code and title for the new unit.'
    return
  }

  adding.value = true
  addError.value = ''
  try {
    if (!course.value?.package_id) throw new Error('This course is not linked to a package.')
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
            package_id: course.value.package_id,
            code: newUnitForm.code.trim(),
            title: newUnitForm.title.trim(),
            content: {},
          })).id
        : existingUnitForm.unit_id
      : ''
    const data = addKind.value === 'group'
      ? { ...(!editingGroup.value ? { type: 'G', package_id: course.value.package_id } : {}), title: groupForm.title.trim(), ancestry, position: editingGroup.value?.position || position }
      : { type: 'U', package_id: course.value.package_id, unit_id: unitId, ancestry, position }
    await courseUnitsApi.save(courseId, data, editingGroup.value?.id)
    addDialog.value = false
    editingGroup.value = null
    await loadUnits()
    emit('contentUpdated')
  } catch (cause) {
    addError.value = getApiErrorMessage(cause, 'Unable to add item to the course.')
  } finally {
    adding.value = false
  }
}

function unitEditPath(unitId: string) {
  if (catalogueUnitIds.value.has(unitId)) {
    return `/courses/${encodeURIComponent(courseId)}/current/units/${encodeURIComponent(unitId)}/view`
  }
  return `/courses/${encodeURIComponent(courseId)}/current/units/${encodeURIComponent(unitId)}/edit`
}

function blockEditPath(unitId: string, blockId: string) {
  if (catalogueUnitIds.value.has(unitId)) {
    return `/courses/${encodeURIComponent(courseId)}/current/units/${encodeURIComponent(unitId)}/view/blocks/${encodeURIComponent(blockId)}`
  }
  return `${unitEditPath(unitId)}/blocks/${encodeURIComponent(blockId)}`
}
</script>

<template>
  <section v-if="!props.embedded" class="page-header mb-8">
    <div>
      <div class="text-overline text-primary font-weight-bold">LEARNING</div>
      <h1 class="text-h4 font-weight-bold mt-1">{{ course?.title || 'Edit course' }}</h1>
    </div>
    <div class="d-flex ga-3">
      <ButtonsBase :to="`/courses/${courseId}/dashboard`" variant="text">Back</ButtonsBase>
      <ButtonsBase color="primary" prepend-icon="mdi-pencil-outline" :disabled="!course?.permissions?.update" @click="detailsDialog = true">Course details</ButtonsBase>
    </div>
  </section>
  <div v-else class="d-flex justify-end pa-5 pb-0">
    <ButtonsBase color="primary" prepend-icon="mdi-pencil-outline" @click="detailsDialog = true">Edit course details</ButtonsBase>
  </div>
  <VAlert v-if="error && !detailsDialog" class="mb-5" color="error" density="compact" variant="tonal">{{ error }}</VAlert>

  <VCard class="mt-6" rounded="xl" variant="flat">
    <div class="d-flex align-center justify-space-between ga-4 bg-grey-lighten-4 px-5 py-2">
      <VTextField v-model="search" class="unit-search" density="compact" hide-details placeholder="Search" prepend-inner-icon="mdi-magnify" rounded="lg" variant="solo" />
      <ButtonsBase v-if="course?.permissions?.update" color="primary" prepend-icon="mdi-plus" variant="text" @click="openAddDialog">Add to course</ButtonsBase>
    </div>
    <VProgressLinear v-if="loadingUnits" color="primary" indeterminate />
    <div v-if="!loadingUnits && !outlineTree.length" class="pa-8 text-center text-medium-emphasis">No units found.</div>
    <CatalogueOutline
      v-if="outlineTree.length"
      :rows="outlineTree"
      :units="outlineUnits"
      :unit-path="unitEditPath"
      :block-path="blockEditPath"
      :show-block-titles="true"
    >
      <template #actions="{ row }">
        <VChip v-if="row.catalogue_source" size="x-small" variant="tonal">Catalogue</VChip>
        <template v-else-if="row.type === 'G'">
          <ButtonsBase v-if="course?.permissions?.update" density="compact" prepend-icon="mdi-plus" size="small" variant="text" @click.stop="openAddUnitDialog(row.id)">Add to group</ButtonsBase>
          <ButtonsBase v-if="course?.permissions?.update" aria-label="Edit group" density="compact" icon="mdi-pencil-outline" size="small" variant="text" @click.stop="editGroup(row.id)" />
          <ButtonsBase v-if="course?.permissions?.delete" aria-label="Delete group" color="error" density="compact" icon="mdi-delete-outline" size="small" variant="text" @click.stop="deleteGroup(row.id)" />
        </template>
        <ButtonsBase v-else-if="row.type === 'U' && course?.permissions?.delete" color="error" density="compact" prepend-icon="mdi-delete-outline" size="small" variant="text" @click.stop="removeUnitReference(row.id)">Remove from course</ButtonsBase>
      </template>
    </CatalogueOutline>
  </VCard>

  <VDialog v-model="detailsDialog" max-width="640">
    <VCard rounded="xl">
      <VCardTitle class="pa-6 pb-2">Course details</VCardTitle>
      <VCardText class="pa-6 pt-2">
        <VAlert v-if="error" class="mb-5" color="error" density="compact" variant="tonal">{{ error }}</VAlert>
        <VForm @submit.prevent="submit">
          <FormsVjsfForm v-if="courseEdit.form.value" v-model="courseEdit.form.value.model" :schema="courseEdit.form.value.schema" />
          <div class="d-flex justify-end ga-3 mt-4">
            <ButtonsBase :disabled="submitting" variant="text" @click="detailsDialog = false">Cancel</ButtonsBase>
            <ButtonsBase color="primary" :loading="submitting" type="submit">Save changes</ButtonsBase>
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
          <VProgressLinear v-if="addFormLoading" class="mb-3" color="primary" indeterminate />
          <div v-if="addUnitMode === 'existing' && !availableUnits.length" class="text-body-2 text-medium-emphasis">All available units are already in this course.</div>
        </template>
        <FormsVjsfForm v-if="addKind === 'group' && addVjsfSchema" :model-value="groupForm" :schema="addVjsfSchema" @update:model-value="Object.assign(groupForm, $event)" />
        <FormsVjsfForm v-else-if="addUnitMode === 'existing' && addVjsfSchema" :model-value="existingUnitForm" :schema="addVjsfSchema" @update:model-value="Object.assign(existingUnitForm, $event)" />
        <FormsVjsfForm v-else-if="addVjsfSchema" :model-value="newUnitForm" :schema="addVjsfSchema" @update:model-value="Object.assign(newUnitForm, $event)" />
      </VCardText>
      <VCardActions class="pa-6 pt-0">
        <VSpacer />
        <ButtonsBase :disabled="adding || addFormLoading" variant="text" @click="addDialog = false">Cancel</ButtonsBase>
        <ButtonsBase color="primary" :disabled="addFormLoading || !addVjsfSchema" :loading="adding" @click="addToCourse">{{ editingGroup ? 'Save group' : 'Add' }}</ButtonsBase>
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
