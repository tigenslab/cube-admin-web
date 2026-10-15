<script setup lang="ts">
import type { Course } from '~/stores/courses'
import type { CourseContentItem, CourseContentKind, CourseContentInput } from '~/composables/useCourseContentApi'

const route = useRoute()
const courseId = String(route.params.id)
const courses = useCoursesStore()
const api = useCourseContentApi()
const course = ref<Course | null>(null)
const structure = ref<CourseContentItem[]>([])
const units = ref<CourseContentItem[]>([])
const blocks = ref<CourseContentItem[]>([])
const tab = ref<CourseContentKind>('course_units')
const selectedUnit = ref<string | null>(null)
const loading = ref(true)
const blocksLoading = ref(false)
const error = ref('')
const notice = ref('')
const saving = ref(false)
const dialog = ref(false)
const deleteTarget = ref<CourseContentItem | null>(null)
const detail = ref<CourseContentItem | null>(null)
const editing = ref<CourseContentItem | null>(null)
const formError = ref('')
const form = reactive({ type: '', title: '', code: '', unit_id: '', parent: '', position: '' as string | number, linked_block_id: '', description: '' })
const canEdit = computed(() => course.value?.status === 'draft' && Boolean(course.value.permissions?.update))
const selectedUnitItem = computed(() => units.value.find(unit => unit.id === selectedUnit.value))
const linkedUnitIds = computed(() => new Set(structure.value.map(item => item.unit_id).filter((id): id is string => Boolean(id))))
const linkedUnits = computed(() => units.value.filter(unit => linkedUnitIds.value.has(unit.id)))
const blockTree = computed(() => {
  const nodes = new Map<string, CourseContentItem & { children: CourseContentItem[] }>()
  for (const block of items.value) nodes.set(block.id, { ...block, children: [] })
  const roots: Array<CourseContentItem & { children: CourseContentItem[] }> = []
  for (const node of nodes.values()) {
    const parentId = node.ancestry?.split('/').filter(Boolean).at(-1)
    const parent = parentId ? nodes.get(parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
})
const firstLeafBlock = computed(() => {
  const firstLeaf = (node: CourseContentItem & { children: CourseContentItem[] }): CourseContentItem | null =>
    node.children.length ? firstLeaf(node.children[0]!) : node
  return blockTree.value.length ? firstLeaf(blockTree.value[0]!) : null
})
const activeBlock = computed(() => blocks.value.find(block => block.id === activeBlockId.value) || null)
const activeBlockId = ref<string | null>(null)
const canCreate = computed(() => canEdit.value && (tab.value !== 'unit_blocks' || Boolean(selectedUnitItem.value?.permissions?.update)))
const labels: Record<CourseContentKind, string> = { course_units: 'course item', units: 'unit', unit_blocks: 'block' }
const types = computed(() => tab.value === 'course_units'
  ? [{ title: 'Group', value: 'CourseUnit::Group' }, { title: 'Unit reference', value: 'CourseUnit::Unit' }]
  : tab.value === 'unit_blocks'
    ? [{ title: 'Group', value: 'UnitBlock::Group' }, { title: 'Theory', value: 'UnitBlock::Theory::Block' }, { title: 'Assessment', value: 'UnitBlock::Assessment::Block' }, { title: 'Block', value: 'UnitBlock' }, { title: 'Theory section', value: 'UnitBlock::Theory' }, { title: 'Assessment section', value: 'UnitBlock::Assessment' }]
    : [])
const rawItems = computed(() => tab.value === 'course_units' ? structure.value : tab.value === 'units' ? units.value : blocks.value)
const itemById = computed(() => new Map(rawItems.value.map(item => [item.id, item])))
function path(item: CourseContentItem): number[] {
  return [...(item.ancestry?.split('/').filter(Boolean) || []).map(id => itemById.value.get(id)?.position || 0), item.position || 0]
}
const items = computed(() => [...rawItems.value].sort((a, b) => {
  if (tab.value === 'units') return (a.title || '').localeCompare(b.title || '')
  const left = path(a), right = path(b)
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    if (left[i] !== right[i]) return left[i]! - right[i]!
  }
  return left.length - right.length
}))
function itemTitle(item: CourseContentItem) {
  return item.title || units.value.find(unit => unit.id === item.unit_id)?.title || 'Untitled'
}
function typeLabel(item: CourseContentItem) {
  if (item.type === 'CourseUnit::Unit') return 'Unit reference'
  return item.type.split('::').filter(part => part !== 'Block').at(-1) || 'Block'
}
function depth(item: CourseContentItem) { return item.ancestry?.split('/').filter(Boolean).length || 0 }
function hierarchyPath(item: CourseContentItem) { return [item.ancestry, item.id].filter(Boolean).join('/') }
const parentOptions = computed(() => [
  { title: 'Top level', value: '' },
  ...items.value.filter(item => item.id !== editing.value?.id && !item.ancestry?.split('/').includes(editing.value?.id || '\0'))
    .map(item => ({ title: `${'— '.repeat(depth(item))}${itemTitle(item)}`, value: hierarchyPath(item) })),
])
const unitOptions = computed(() => units.value.map(unit => ({ title: `${unit.code || ''} — ${unit.title || 'Untitled'}`, value: unit.id })))
const blockUnitOptions = computed(() => linkedUnits.value.map(unit => ({ title: `${unit.code || ''} — ${unit.title || 'Untitled'}`, value: unit.id })))
const linkOptions = computed(() => [{ title: 'No linked block', value: '' }, ...blocks.value.filter(item => item.id !== editing.value?.id).map(item => ({ title: itemTitle(item), value: item.id }))])

let blockRequest = 0
async function loadBlocks() {
  const request = ++blockRequest
  blocks.value = []
  if (!selectedUnit.value) { blocksLoading.value = false; return }
  blocksLoading.value = true
  try {
    const data = await api.list(courseId, 'unit_blocks', selectedUnit.value)
    if (request === blockRequest) {
      blocks.value = data.items
      if (!data.items.some(item => item.id === activeBlockId.value)) activeBlockId.value = null
    }
  } catch (cause) {
    if (request === blockRequest) error.value = getApiErrorMessage(cause, 'Unable to load unit blocks.')
  } finally {
    if (request === blockRequest) blocksLoading.value = false
  }
}
watch(selectedUnit, loadBlocks)
watch(firstLeafBlock, block => {
  if (!activeBlockId.value && block) activeBlockId.value = block.id
})
async function load() {
  loading.value = true
  error.value = ''
  try {
    course.value = await courses.show(courseId)
    if (!course.value.permissions?.read) return
    const [hierarchy, unitList] = await Promise.all([api.list(courseId, 'course_units'), api.list(courseId, 'units')])
    structure.value = hierarchy.items
    units.value = unitList.items
    if (!linkedUnitIds.value.has(selectedUnit.value || '')) selectedUnit.value = linkedUnits.value[0]?.id || null
    else await loadBlocks()
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load course content.')
  } finally { loading.value = false }
}
onMounted(load)
function openEditor(item: CourseContentItem | null = null) {
  editing.value = item
  formError.value = ''
  Object.assign(form, {
    type: item?.type || (tab.value === 'course_units' ? 'CourseUnit::Group' : tab.value === 'unit_blocks' ? 'UnitBlock::Theory::Block' : 'Unit'),
    title: tab.value === 'unit_blocks' ? String(item?.content?.title ?? '') : item?.title || '',
    code: item?.code || '', unit_id: item?.unit_id || units.value[0]?.id || '',
    parent: item?.ancestry || '', position: item?.position ?? '', linked_block_id: item?.linked_block_id || '',
    description: typeof item?.content?.description === 'string' ? item.content.description : '',
  })
  dialog.value = true
}
async function save() {
  if (saving.value || !canCreate.value) return
  formError.value = ''
  const data: CourseContentInput = { type: form.type }
  if (tab.value === 'units') {
    if (!form.code.trim() || !form.title.trim()) { formError.value = 'Enter a code and title.'; return }
    data.code = form.code.trim(); data.title = form.title.trim()
    data.content = { ...editing.value?.content, description: form.description }
  } else {
    data.ancestry = form.parent
    if (form.position !== '') {
      const position = Number(form.position)
      if (!Number.isSafeInteger(position) || position < 1) { formError.value = 'Position must be a positive whole number.'; return }
      data.position = position
    }
    if (tab.value === 'course_units') {
      if (form.type === 'CourseUnit::Unit') {
        if (!form.unit_id) { formError.value = 'Select a unit. Create one in the Units tab if needed.'; return }
        data.unit_id = form.unit_id
      } else {
        if (!form.title.trim()) { formError.value = 'Enter a group title.'; return }
        data.title = form.title.trim()
        if (form.code.trim()) data.code = form.code.trim()
      }
    } else {
      if (!form.title.trim() && !form.linked_block_id && !editing.value?.metadata?.title) { formError.value = 'Enter a title or choose a linked block.'; return }
      data.content = { ...editing.value?.content, description: form.description }
      if (form.title.trim()) data.content.title = form.title.trim()
      else delete data.content.title
      if (form.linked_block_id || editing.value?.linked_block_id) data.linked_block_id = form.linked_block_id || null
    }
  }
  saving.value = true
  try {
    await api.save(courseId, tab.value, data, editing.value?.id, selectedUnit.value || undefined)
    dialog.value = false
    notice.value = 'Changes saved.'
    await load()
  } catch (cause) { formError.value = getApiErrorMessage(cause, 'Unable to save changes.') }
  finally { saving.value = false }
}
async function remove() {
  const item = deleteTarget.value
  if (!item || saving.value) return
  saving.value = true; formError.value = ''
  try {
    await api.remove(courseId, tab.value, item.id, selectedUnit.value || undefined)
    deleteTarget.value = null
    notice.value = 'Item deleted.'
    await load()
  } catch (cause) { formError.value = getApiErrorMessage(cause, 'Unable to delete this item.') }
  finally { saving.value = false }
}
function showBlocks(unit: CourseContentItem) {
  selectedUnit.value = unit.id
  tab.value = 'unit_blocks'
}
function showUnit(unit: CourseContentItem) {
  if (!linkedUnitIds.value.has(unit.id)) return
  showBlocks(unit)
}
function addUnitToCourse(unit: CourseContentItem) {
  tab.value = 'course_units'
  openEditor()
  form.type = 'CourseUnit::Unit'
  form.unit_id = unit.id
}
</script>

<template>
  <VBtn class="mb-4" :to="`/courses/${courseId}`" variant="text" prepend-icon="mdi-arrow-left">Back to course</VBtn>
  <div class="mb-6">
    <div class="text-overline text-primary">LEARNING</div>
    <h1 class="text-h4 font-weight-bold">{{ course?.title || 'Course content' }}</h1>
    <p class="text-body-1 text-medium-emphasis mt-2">Organize the course outline, units, and learning blocks.</p>
  </div>
  <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
    {{ error }} <VBtn variant="text" size="small" :disabled="loading || saving" @click="load">Retry</VBtn>
  </VAlert>
  <VAlert v-if="course && !canEdit" class="mb-4" type="info" variant="tonal">
    {{ course.status !== 'draft' ? 'Course content can be edited when the course is a draft.' : 'You have read-only access to this course.' }}
  </VAlert>
  <VCard v-if="course?.permissions?.read" rounded="xl" variant="flat">
    <VTabs v-model="tab" color="primary" :disabled="saving || dialog || !!deleteTarget">
      <VTab value="course_units">Course outline</VTab><VTab value="units">Units</VTab><VTab value="unit_blocks">Unit blocks</VTab>
    </VTabs>
    <VProgressLinear v-if="loading || blocksLoading" indeterminate color="primary" />
    <VCardText class="pa-6">
      <VSelect v-if="tab === 'unit_blocks'" v-model="selectedUnit" :items="blockUnitOptions" label="Unit" :disabled="loading || saving" no-data-text="Add a unit to the course outline first." />
      <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
        <div>
          <h2 class="text-h6">{{ tab === 'course_units' ? 'Course outline' : tab === 'units' ? 'Course units' : 'Learning blocks' }}</h2>
          <p class="text-body-2 text-medium-emphasis">{{ tab === 'course_units' ? 'Add groups and references to units to build your outline.' : tab === 'units' ? 'Create units here, then add them to the course outline.' : 'Add groups, theory, and assessment blocks to the selected unit.' }}</p>
        </div>
        <VBtn v-if="canCreate" color="primary" prepend-icon="mdi-plus" :disabled="loading || blocksLoading || saving" @click="openEditor()">Add {{ labels[tab] }}</VBtn>
      </div>
      <VTable v-if="items.length">
        <thead><tr><th>{{ tab === 'units' ? 'Unit' : 'Title' }}</th><th>Type</th><th v-if="tab === 'units'">Code</th><th v-else>Position</th><th aria-label="Actions" /></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td><div class="py-3" :style="{ paddingLeft: `${Math.min(depth(item), 8) * 20}px` }">
              <VIcon v-if="item.type.endsWith('::Group')" icon="mdi-folder-outline" size="small" class="mr-2" />
              {{ itemTitle(item) }}
              <VChip v-if="item.linked_block_id" class="ml-2" size="x-small" variant="tonal">Linked</VChip>
            </div></td>
            <td>{{ typeLabel(item) }}</td><td>{{ tab === 'units' ? item.code : item.position }}</td>
            <td class="text-no-wrap text-right">
              <VBtn v-if="tab === 'units' && linkedUnitIds.has(item.id)" size="small" variant="text" @click="showUnit(item)">Open unit</VBtn>
              <VBtn v-else-if="tab === 'units'" size="small" variant="text" :disabled="!canEdit" @click="addUnitToCourse(item)">Add to course outline</VBtn>
              <VBtn v-else-if="tab === 'unit_blocks'" size="small" variant="text" @click="activeBlockId = item.id">View</VBtn>
              <VBtn v-if="tab === 'course_units' && item.unit_id" size="small" variant="text" @click="selectedUnit = item.unit_id; tab = 'unit_blocks'">View blocks</VBtn>
              <VBtn v-if="canEdit && item.permissions?.update" :aria-label="`Edit ${itemTitle(item)}`" icon="mdi-pencil-outline" size="small" variant="text" :disabled="saving || loading" @click="openEditor(item)" />
              <VBtn v-if="canEdit && item.permissions?.delete" :aria-label="`Delete ${itemTitle(item)}`" icon="mdi-delete-outline" size="small" variant="text" :disabled="saving || loading" @click="deleteTarget = item; formError = ''" />
            </td>
          </tr>
        </tbody>
      </VTable>
      <div v-else-if="!loading && !blocksLoading" class="text-center text-medium-emphasis py-12">
        <VIcon icon="mdi-book-open-page-variant-outline" size="42" class="mb-3" />
        <p>{{ tab === 'unit_blocks' && !selectedUnit ? 'Choose a unit to view its blocks.' : 'No items yet.' }}</p>
      </div>
      <VCard v-if="tab === 'unit_blocks' && selectedUnitItem" class="mt-6" variant="outlined" rounded="lg">
        <div class="d-flex flex-wrap">
          <VNavigationDrawer class="position-relative" permanent width="300" :mobile="false">
            <div class="pa-4">
              <div class="text-overline">{{ selectedUnitItem.code }}</div>
              <div class="text-h6">{{ selectedUnitItem.title }}</div>
            </div>
            <VDivider />
            <VList nav density="compact" open-strategy="multiple">
              <CourseBlockTree :nodes="blockTree" :active-id="activeBlockId" :title="itemTitle" @select="activeBlockId = $event" />
            </VList>
          </VNavigationDrawer>
          <VDivider vertical />
          <div class="flex-grow-1 pa-6" style="min-width: 280px">
            <template v-if="activeBlock">
              <div class="text-overline">{{ typeLabel(activeBlock) }}</div>
              <h2 class="text-h5 mb-3">{{ activeBlock.title || 'Untitled block' }}</h2>
              <p class="text-body-1 text-medium-emphasis" style="white-space: pre-wrap">{{ activeBlock.merged_content?.description || activeBlock.content?.description || 'No description added.' }}</p>
              <VAlert v-if="activeBlock.component_ids?.length" class="mt-6" type="info" variant="tonal">This block has {{ activeBlock.component_ids.length }} learning component(s). Component preview is not available in the admin API yet.</VAlert>
            </template>
            <div v-else class="text-medium-emphasis">Select a block from the unit outline.</div>
          </div>
        </div>
      </VCard>
    </VCardText>
  </VCard>
  <VProgressLinear v-else-if="loading" indeterminate color="primary" />

  <VDialog :model-value="!!detail" max-width="640" @update:model-value="value => { if (!value) detail = null }">
    <VCard v-if="detail" rounded="lg" :title="itemTitle(detail)">
      <VCardText>
        <VChip class="mb-4" variant="tonal">{{ typeLabel(detail) }}</VChip>
        <p v-if="detail.code" class="mb-4">Code: {{ detail.code }}</p>
        <p class="text-body-1" style="white-space: pre-wrap">{{ detail.merged_content?.description || detail.content?.description || 'No description added.' }}</p>
      </VCardText>
      <VCardActions><VSpacer /><VBtn @click="detail = null">Close</VBtn></VCardActions>
    </VCard>
  </VDialog>
  <VDialog v-model="dialog" max-width="640" :persistent="saving">
    <VCard rounded="lg">
      <VCardTitle>{{ editing ? 'Edit' : 'Add' }} {{ labels[tab] }}</VCardTitle>
      <VCardText>
        <VAlert v-if="formError" type="error" variant="tonal" class="mb-4">{{ formError }}</VAlert>
        <VForm id="content-form" :disabled="saving" @submit.prevent="save">
          <VTextField v-if="tab === 'units'" v-model="form.type" label="Unit type" required />
          <VSelect v-else v-model="form.type" :items="types" label="Type" :disabled="!!editing" />
          <VSelect v-if="tab === 'course_units' && form.type === 'CourseUnit::Unit'" v-model="form.unit_id" :items="unitOptions" label="Referenced unit" no-data-text="Create a unit in the Units tab first." required />
          <template v-else>
            <VTextField v-model="form.title" :label="tab === 'unit_blocks' && form.linked_block_id ? 'Title override (optional)' : 'Title'" :required="tab !== 'unit_blocks' || (!form.linked_block_id && !editing?.metadata?.title)" />
            <VTextField v-if="tab !== 'unit_blocks'" v-model="form.code" :label="tab === 'units' ? 'Code' : 'Code (optional)'" :required="tab === 'units'" />
          </template>
          <template v-if="tab !== 'units'">
            <VSelect v-model="form.parent" :items="parentOptions" label="Parent" />
            <VTextField v-model="form.position" label="Position" type="number" min="1" step="1" :hint="editing ? 'Choose an unused position among siblings.' : 'Leave blank to append after siblings.'" persistent-hint />
          </template>
          <VSelect v-if="tab === 'unit_blocks'" v-model="form.linked_block_id" :items="linkOptions" label="Linked block" />
          <VTextarea v-if="tab !== 'course_units'" v-model="form.description" label="Description" rows="4" auto-grow />
        </VForm>
      </VCardText>
      <VCardActions class="pa-4"><VSpacer /><VBtn :disabled="saving" @click="dialog = false">Cancel</VBtn><VBtn color="primary" variant="flat" type="submit" form="content-form" :loading="saving">Save</VBtn></VCardActions>
    </VCard>
  </VDialog>
  <VDialog :model-value="!!deleteTarget" max-width="440" :persistent="saving" @update:model-value="value => { if (!value) deleteTarget = null }">
    <VCard rounded="lg" title="Delete item?">
      <VCardText>
        <VAlert v-if="formError" type="error" variant="tonal" class="mb-4">{{ formError }}</VAlert>
        <p>Delete “{{ deleteTarget ? itemTitle(deleteTarget) : '' }}”? Remove any child items and references first.</p>
      </VCardText>
      <VCardActions><VSpacer /><VBtn :disabled="saving" @click="deleteTarget = null">Cancel</VBtn><VBtn color="error" :loading="saving" @click="remove">Delete</VBtn></VCardActions>
    </VCard>
  </VDialog>
  <VSnackbar :model-value="!!notice" :timeout="3500" @update:model-value="value => { if (!value) notice = '' }">{{ notice }}</VSnackbar>
</template>
