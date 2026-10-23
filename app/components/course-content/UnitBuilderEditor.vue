<script setup lang="ts">
import type { Course } from '~/stores/courses'
import type { CourseResourceItem, UnitBlockComponent } from '~/types/course-resources'
import type { ApiFormSchema } from '~/types/api-form'

const Vjsf = defineAsyncComponent(() => import('@koumoul/vjsf'))
const props = withDefaults(defineProps<{ mode?: 'edit' | 'view' }>(), { mode: 'edit' })
const route = useRoute()
const router = useRouter()
const courseId = String(route.params.id)
const unitId = String(route.params.unitId)
const courses = useCoursesStore()
const unitsApi = useUnitsApi()
const unitBlocksApi = useUnitBlocksApi()
const unitBlockComponentsApi = useUnitBlockComponentsApi()
const course = ref<Course | null>(null)
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
const editingBlock = ref<CourseResourceItem | null>(null)
const form = reactive({ type: 'T:B', parent: '', position: '' as number | string })
const blockForm = reactive({ title: '' })
const unitInfoForm = reactive({ code: '', title: '' })
const editable = computed(() => props.mode === 'edit')
const courseRoute = computed(() => `/courses/${courseId}/${props.mode === 'view' ? 'view' : 'edit'}`)

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
  return title ? { type: 'object', title: 'Block details', properties: { title }, required: ['title'] } : null
})
let componentsRequest = 0

watch(activeBlockId, async (blockId) => {
  const request = ++componentsRequest
  blockComponents.value = []
  error.value = ''
  if (!blockId) {
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

watch(() => route.params.blockId, (value) => {
  if (typeof value === 'string' && blocks.value.some(block => block.id === value)) {
    activeBlockId.value = value
  }
})

function blockTitle(block: CourseResourceItem) {
  return block.title || String(block.content?.title || block.metadata?.title || 'Untitled block')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [courseData, unitForm, blockData] = await Promise.all([
      courses.show(courseId),
      unitsApi.editForm(courseId, unitId),
      unitBlocksApi.list(courseId, unitId),
    ])
    course.value = courseData
    unit.value = { id: unitId, ...unitForm.vjsf.model } as CourseResourceItem
    blocks.value = blockData.items
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
      await router.replace(`/courses/${courseId}/units/${unitId}/edit`)
    }
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load unit content.')
  } finally {
    loading.value = false
  }
}

async function openBlockEditor(block: CourseResourceItem | null = null, defaults: { type?: string; parent?: string; title?: string } = {}) {
  if (!blockFormSchema.value) {
    try {
      const { vjsf } = await unitBlocksApi.newForm(courseId, unitId)
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
      content: unit.value.content,
    }, unitId)
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

function blockChildCount(block: CourseResourceItem) {
  return blocks.value.filter(candidate => candidate.ancestry?.split('/').filter(Boolean).at(-1) === block.id).length
}

function blockPath(blockId: string) {
  return `/courses/${encodeURIComponent(courseId)}/units/${encodeURIComponent(unitId)}/${props.mode}/blocks/${encodeURIComponent(blockId)}`
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
    const saved = await unitBlocksApi.save(courseId, unitId, data, editingBlock.value?.id)
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
    await unitBlocksApi.remove(courseId, unitId, block.id)
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
      const { vjsf } = await unitBlockComponentsApi.newForm(courseId, unitId, blockId)
      componentFormSchema.value = vjsf.schema
      componentFormModel.value = vjsf.model
    }
    if (!componentFormSchema.value.properties?.type?.enum?.includes(type)) throw new Error('This component type is not available.')
    const { item } = await unitBlockComponentsApi.save(courseId, unitId, blockId, {
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

onMounted(load)
</script>

<template>
  <NuxtLayout name="unit-builder">
    <template #sidebar>
    <aside class="builder-sidebar">
      <div class="unit-heading">
        <VBtn :aria-label="`Back to course ${props.mode}`" icon="mdi-chevron-left" :to="courseRoute" variant="text" />
        <div class="unit-heading-text">
          <div>{{ unit?.code }}</div>
          <strong>{{ unit?.title }}</strong>
        </div>
        <VMenu location="end">
          <template #activator="{ props: menuProps }">
            <VBtn v-bind="menuProps" aria-label="Unit actions" icon="mdi-dots-vertical" variant="text" />
          </template>
          <VList v-if="editable" density="comfortable" min-width="250">
            <VListItem prepend-icon="mdi-eye-outline" title="View unit" :to="`/courses/${courseId}/units/${unitId}/view`" />
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
            <VListItem prepend-icon="mdi-arrow-left" title="Course view" :to="courseRoute" />
          </VList>
        </VMenu>
      </div>

      <VProgressLinear v-if="loading" color="primary" indeterminate />
      <VAlert v-if="error" class="ma-3" color="error" density="compact" variant="tonal">{{ error }}</VAlert>

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
      <header class="workspace-header">
        <strong>{{ activeBlock ? blockTitle(activeBlock) : unit?.title || course?.title }}</strong>
        <VBtn aria-label="Preview unit" class="preview-pill" rounded="pill" />
      </header>
      <section class="workspace-content">
        <template v-if="activeBlock">
          <div class="d-flex align-center justify-space-between ga-4">
            <h1 class="text-h5 font-weight-bold">Content Builder 0</h1>
            <VBtn v-if="editable" prepend-icon="mdi-pencil-outline" variant="tonal" @click="openBlockEditor(activeBlock)">Edit</VBtn>
          </div>
          <div class="text-body-2 text-medium-emphasis mt-2">{{ blockTitle(activeBlock) }}</div>
          <VCard class="mt-6" min-height="240" rounded="lg" variant="outlined">
            <VCardText class="pa-6">
              <div v-if="activeBlock.content?.description">{{ activeBlock.content.description }}</div>
              <div v-else class="text-medium-emphasis">This block has no content yet.</div>
            </VCardText>
          </VCard>
          <div class="mt-8">
            <h2 class="text-h6 font-weight-bold mb-3">Components</h2>
            <div v-if="componentsLoading" class="text-body-2 text-medium-emphasis">Loading components…</div>
            <div v-else-if="!blockComponents.length" class="text-body-2 text-medium-emphasis">No components attached to this block.</div>
            <template v-else>
              <VCard v-for="component in blockComponents" :key="component.id" class="mb-3" rounded="lg" variant="outlined">
                <VCardTitle class="text-subtitle-1">{{ component.type }}</VCardTitle>
                <VCardText><pre class="component-content">{{ JSON.stringify(component.content, null, 2) }}</pre></VCardText>
              </VCard>
            </template>
          </div>
        </template>
        <div v-else class="empty-workspace">
          <h1 class="text-h5 font-weight-bold">Content Builder 0</h1>
          <p class="text-body-2 text-medium-emphasis mt-2">Select a block from the outline or add one to get started.</p>
        </div>
      </section>
      <div class="workspace-toolbar">
        <VMenu v-if="editable" location="top">
          <template #activator="{ props: menuProps }">
            <VBtn
              v-bind="menuProps"
              aria-label="Add component"
              icon="mdi-plus-box-multiple-outline"
              :loading="componentSaving"
              :disabled="!activeBlock || isBlockGroup(activeBlock)"
              variant="flat"
            />
          </template>
          <VList density="comfortable" min-width="200">
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
        <VBtn aria-label="Block list" icon="mdi-format-list-bulleted" variant="flat" />
        <VBtn aria-label="Help" icon="mdi-help-circle-outline" variant="flat" />
        <VBtn aria-label="Files" icon="mdi-folder-outline" variant="flat" />
        <VBtn aria-label="More tools" icon="mdi-menu" variant="flat" />
      </div>
    </main>
    </div>
  </NuxtLayout>

  <VDialog v-if="editable" v-model="dialog" max-width="560">
    <VCard rounded="xl">
      <VCardTitle class="pa-6 pb-2">{{ editingBlock ? 'Edit block' : 'Add content block' }}</VCardTitle>
      <VCardText class="pa-6 pt-2">
        <Vjsf v-if="blockVjsfSchema" v-model="blockForm" :schema="blockVjsfSchema" />
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
      </VCardText>
      <VCardActions class="pa-6 pt-0">
        <VSpacer />
        <VBtn :disabled="unitInfoSaving" variant="text" @click="unitInfoDialog = false">Cancel</VBtn>
        <VBtn color="primary" :loading="unitInfoSaving" @click="saveUnitInfo">Save changes</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.builder-shell { height: 100%; min-width: 0; min-height: 0; background: #fff; }
.builder-sidebar { display: flex; width: 100%; height: 100%; min-height: 0; flex-direction: column; border-right: 1px solid #ddd; }
.component-content { margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; font: inherit; }
.unit-heading { display: flex; align-items: center; gap: 8px; margin: 8px; padding: 8px; background: #f0f0f0; }
.unit-heading-text { flex: 1; min-width: 0; font-size: 14px; }
.unit-heading-text strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.block-navigation { flex: 1; overflow: auto; padding-bottom: 12px; }
.sidebar-account { display: flex; min-height: 56px; align-items: center; border-top: 1px solid #eee; padding: 4px 8px; }
.sidebar-account :deep(.account-button) { justify-content: flex-start; width: 100%; }
.builder-workspace { display: flex; width: 100%; height: 100%; min-width: 0; min-height: 0; flex-direction: column; }
.workspace-header { display: flex; min-height: 70px; align-items: center; justify-content: space-between; padding: 0 16px; background: #f5f5f5; }
.preview-pill { width: 150px; height: 38px; background: #bdbdbd; }
.workspace-content { flex: 1; padding: 24px 20px; }
.workspace-toolbar { display: flex; min-height: 72px; align-items: center; gap: 12px; border-top: 1px solid #ddd; background: #f5f5f5; padding: 8px 12px; }
.workspace-toolbar :deep(.v-btn) { width: 48px; height: 48px; border-radius: 50%; background: white; box-shadow: 0 2px 5px #0002; }
.empty-workspace { padding: 0 0 0 0; }
</style>
