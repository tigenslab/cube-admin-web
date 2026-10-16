<script setup lang="ts">
import type { Course } from '~/stores/courses'
import type { CourseContentItem } from '~/composables/useCourseContentApi'

definePageMeta({ layout: 'unit_builder' })

const route = useRoute()
const router = useRouter()
const courseId = String(route.params.id)
const unitId = String(route.params.unitId)
const courses = useCoursesStore()
const contentApi = useCourseContentApi()
const course = ref<Course | null>(null)
const unit = ref<CourseContentItem | null>(null)
const blocks = ref<CourseContentItem[]>([])
const activeBlockId = ref<string | null>(null)
const loading = ref(true)
const saving = ref(false)
const unitInfoSaving = ref(false)
const error = ref('')
const dialog = ref(false)
const unitInfoDialog = ref(false)
const editingBlock = ref<CourseContentItem | null>(null)
const form = reactive({ type: 'UnitBlock::Theory::Block', title: '', parent: '', position: '' as number | string })
const unitInfoForm = reactive({ code: '', title: '' })

const orderedBlocks = computed(() => {
  const byParent = new Map<string, CourseContentItem[]>()
  for (const block of blocks.value) {
    const parentId = block.ancestry?.split('/').filter(Boolean).at(-1) || ''
    const siblings = byParent.get(parentId) || []
    siblings.push(block)
    byParent.set(parentId, siblings)
  }
  for (const siblings of byParent.values()) siblings.sort((a, b) => (a.position || 0) - (b.position || 0))
  const ordered: CourseContentItem[] = []
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
  for (const block of blocks.value) {
    if (!visited.has(block.id)) {
      visited.add(block.id)
      ordered.push(block)
      addChildren(block.id)
    }
  }
  return ordered
})
const activeBlock = computed(() => blocks.value.find(block => block.id === activeBlockId.value) || null)

watch(() => route.query.block, (value) => {
  if (typeof value === 'string' && blocks.value.some(block => block.id === value)) {
    activeBlockId.value = value
  }
})

function blockTitle(block: CourseContentItem) {
  return block.title || String(block.content?.title || block.metadata?.title || 'Untitled block')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [courseData, unitData, blockData] = await Promise.all([
      courses.show(courseId),
      contentApi.list(courseId, 'units'),
      contentApi.list(courseId, 'unit_blocks', unitId),
    ])
    course.value = courseData
    unit.value = unitData.items.find(item => item.id === unitId) || null
    if (!unit.value) throw new Error('Unit not found.')
    blocks.value = blockData.items
    const requestedBlockId = typeof route.query.block === 'string' ? route.query.block : null
    if (requestedBlockId && blocks.value.some(block => block.id === requestedBlockId)) {
      activeBlockId.value = requestedBlockId
    } else if (!blocks.value.some(block => block.id === activeBlockId.value)) {
      activeBlockId.value = blocks.value.find(block => !blocks.value.some(candidate => candidate.ancestry?.split('/').includes(block.id)))?.id || null
    }
    const query = { ...route.query }
    if (activeBlockId.value) query.block = activeBlockId.value
    else delete query.block
    await router.replace({ query })
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load unit content.')
  } finally {
    loading.value = false
  }
}

function openBlockEditor(block: CourseContentItem | null = null, defaults: { type?: string; parent?: string; title?: string } = {}) {
  editingBlock.value = block
  Object.assign(form, {
    type: block?.type || defaults.type || 'UnitBlock::Theory::Block',
    title: String(block?.content?.title ?? block?.metadata?.title ?? block?.title ?? defaults.title ?? ''),
    parent: block?.ancestry ?? defaults.parent ?? '',
    position: block?.position ?? '',
  })
  dialog.value = true
}

function addBlockSubtype(kind: 'Theory' | 'Assessment', subtype: 'Group' | 'Section', parent?: CourseContentItem) {
  const categoryType = `UnitBlock::${kind}`
  const type = subtype === 'Group'
    ? parent ? 'UnitBlock::Group' : categoryType
    : `${categoryType}::Block`
  const category = !parent && subtype === 'Section'
    ? blocks.value.find(block => block.type === categoryType && !block.ancestry)
    : undefined
  const parentPath = parent
    ? [parent.ancestry, parent.id].filter(Boolean).join('/')
    : category?.id || ''
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
    unit.value = await contentApi.save(courseId, 'units', {
      type: unit.value.type,
      code: unitInfoForm.code.trim(),
      title: unitInfoForm.title.trim(),
      status: unit.value.status,
      content: unit.value.content,
    }, unitId)
    unitInfoDialog.value = false
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to update unit information.')
  } finally {
    unitInfoSaving.value = false
  }
}

function isBlockGroup(block: CourseContentItem) {
  return ['UnitBlock::Group', 'UnitBlock::Theory', 'UnitBlock::Assessment'].includes(block.type)
}

function groupCategory(block: CourseContentItem): 'Theory' | 'Assessment' | null {
  if (block.type === 'UnitBlock::Theory') return 'Theory'
  if (block.type === 'UnitBlock::Assessment') return 'Assessment'
  const ancestors = block.ancestry?.split('/').filter(Boolean).reverse() || []
  for (const ancestorId of ancestors) {
    const ancestor = blocks.value.find(candidate => candidate.id === ancestorId)
    if (ancestor?.type === 'UnitBlock::Theory') return 'Theory'
    if (ancestor?.type === 'UnitBlock::Assessment') return 'Assessment'
  }
  return null
}

function addGroupSection(block: CourseContentItem) {
  const category = groupCategory(block)
  if (category) addBlockSubtype(category, 'Section', block)
}

function blockIcon(block: CourseContentItem) {
  if (block.type === 'UnitBlock::Theory') return 'mdi-book-open-variant'
  if (block.type === 'UnitBlock::Assessment') return 'mdi-clipboard-list-outline'
  if (block.type === 'UnitBlock::Group') return 'mdi-folder-outline'
  if (block.type === 'UnitBlock::Theory::Block' || block.type === 'UnitBlock::Assessment::Block') return 'mdi-bookmark-outline'
  return String(block.merged_content?.icon || 'mdi-book-outline')
}

function blockChildCount(block: CourseContentItem) {
  return blocks.value.filter(candidate => candidate.ancestry?.split('/').filter(Boolean).at(-1) === block.id).length
}

function selectBlock(blockId: string) {
  activeBlockId.value = blockId
  if (route.query.block !== blockId) router.push({ query: { ...route.query, block: blockId } })
}

async function saveBlock() {
  if (saving.value || (!form.title.trim() && !editingBlock.value?.linked_block_id)) return
  saving.value = true
  error.value = ''
  try {
    const data = {
      type: form.type,
      ancestry: form.parent,
      content: { ...editingBlock.value?.content, ...(form.title.trim() ? { title: form.title.trim() } : {}) },
      ...(form.position !== '' ? { position: Number(form.position) } : {}),
    }
    const saved = await contentApi.save(courseId, 'unit_blocks', data, editingBlock.value?.id, unitId)
    dialog.value = false
    await load()
    selectBlock(saved.id)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to save block.')
  } finally {
    saving.value = false
  }
}

async function deleteBlock(block: CourseContentItem) {
  if (!confirm(`Delete “${blockTitle(block)}”?`)) return
  try {
    await contentApi.remove(courseId, 'unit_blocks', block.id, unitId)
    if (activeBlockId.value === block.id) activeBlockId.value = null
    await load()
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to delete block.')
  }
}

onMounted(load)
</script>

<template>
  <div class="builder-shell">
    <aside class="builder-sidebar">
      <div class="unit-heading">
        <VBtn aria-label="Back to course edit" icon="mdi-chevron-left" :to="`/courses/${courseId}/edit`" variant="text" />
        <div class="unit-heading-text">
          <div>{{ unit?.code }}</div>
          <strong>{{ unit?.title }}</strong>
        </div>
        <VMenu location="end">
          <template #activator="{ props }">
            <VBtn v-bind="props" aria-label="Unit actions" icon="mdi-dots-vertical" variant="text" />
          </template>
          <VList density="comfortable" min-width="250">
            <VListItem prepend-icon="mdi-pencil-outline" title="Edit unit Info" @click="openUnitInfo" />
            <VDivider class="my-1" />
            <VMenu location="end" open-on-hover>
              <template #activator="{ props }">
                <VListItem v-bind="props" prepend-icon="mdi-book-plus-outline" append-icon="mdi-chevron-right" title="Add Theory" />
              </template>
              <VList density="comfortable" min-width="180">
                <VListItem prepend-icon="mdi-folder-plus-outline" title="Group" @click="addBlockSubtype('Theory', 'Group')" />
                <VListItem prepend-icon="mdi-bookmark-plus-outline" title="Section" @click="addBlockSubtype('Theory', 'Section')" />
              </VList>
            </VMenu>
            <VMenu location="end" open-on-hover>
              <template #activator="{ props }">
                <VListItem v-bind="props" prepend-icon="mdi-comment-question-outline" append-icon="mdi-chevron-right" title="Add Assessment" />
              </template>
              <VList density="comfortable" min-width="180">
                <VListItem prepend-icon="mdi-folder-plus-outline" title="Group" @click="addBlockSubtype('Assessment', 'Group')" />
                <VListItem prepend-icon="mdi-bookmark-plus-outline" title="Section" @click="addBlockSubtype('Assessment', 'Section')" />
              </VList>
            </VMenu>
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
              <VMenu location="end">
                <template #activator="{ props }">
                  <VBtn v-bind="props" aria-label="Block actions" density="compact" icon="mdi-dots-vertical" size="small" variant="text" @click.stop />
                </template>
                <VList density="comfortable" min-width="210">
                  <template v-if="isBlockGroup(block)">
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

    <main class="builder-workspace">
      <header class="workspace-header">
        <strong>{{ activeBlock ? blockTitle(activeBlock) : unit?.title || course?.title }}</strong>
        <VBtn aria-label="Preview unit" class="preview-pill" rounded="pill" />
      </header>
      <section class="workspace-content">
        <template v-if="activeBlock">
          <div class="d-flex align-center justify-space-between ga-4">
            <h1 class="text-h5 font-weight-bold">Content Builder 0</h1>
            <VBtn prepend-icon="mdi-pencil-outline" variant="tonal" @click="openBlockEditor(activeBlock)">Edit</VBtn>
          </div>
          <div class="text-body-2 text-medium-emphasis mt-2">{{ blockTitle(activeBlock) }}</div>
          <VCard class="mt-6" min-height="240" rounded="lg" variant="outlined">
            <VCardText class="pa-6">
              <div v-if="activeBlock.content?.description">{{ activeBlock.content.description }}</div>
              <div v-else class="text-medium-emphasis">This block has no content yet.</div>
            </VCardText>
          </VCard>
        </template>
        <div v-else class="empty-workspace">
          <h1 class="text-h5 font-weight-bold">Content Builder 0</h1>
          <p class="text-body-2 text-medium-emphasis mt-2">Select a block from the outline or add one to get started.</p>
        </div>
      </section>
      <div class="workspace-toolbar">
        <VBtn aria-label="Add block" icon="mdi-plus-box-multiple-outline" variant="flat" @click="openBlockEditor()" />
        <VBtn aria-label="Block list" icon="mdi-format-list-bulleted" variant="flat" />
        <VBtn aria-label="Help" icon="mdi-help-circle-outline" variant="flat" />
        <VBtn aria-label="Files" icon="mdi-folder-outline" variant="flat" />
        <VBtn aria-label="More tools" icon="mdi-menu" variant="flat" />
      </div>
    </main>
    <footer class="workspace-footer">© 2025 Cube</footer>
  </div>

  <VDialog v-model="dialog" max-width="560">
    <VCard rounded="xl">
      <VCardTitle class="pa-6 pb-2">{{ editingBlock ? 'Edit block' : 'Add content block' }}</VCardTitle>
      <VCardText class="pa-6 pt-2">
        <VTextField v-model="form.title" label="Title" />
      </VCardText>
      <VCardActions class="pa-6 pt-0">
        <VSpacer />
        <VBtn variant="text" @click="dialog = false">Cancel</VBtn>
        <VBtn color="primary" :loading="saving" @click="saveBlock">Save block</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="unitInfoDialog" max-width="560">
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
.builder-shell { display: grid; grid-template-columns: 390px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) 42px; height: 100vh; background: #fff; }
.builder-sidebar { display: flex; min-height: 0; flex-direction: column; grid-column: 1; grid-row: 1; border-right: 1px solid #ddd; }
.unit-heading { display: flex; align-items: center; gap: 8px; margin: 8px; padding: 8px; background: #f0f0f0; }
.unit-heading-text { flex: 1; min-width: 0; font-size: 14px; }
.unit-heading-text strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.block-navigation { flex: 1; overflow: auto; padding-bottom: 12px; }
.sidebar-account { display: flex; min-height: 56px; align-items: center; border-top: 1px solid #eee; padding: 4px 8px; }
.sidebar-account :deep(.account-button) { justify-content: flex-start; width: 100%; }
.builder-workspace { display: flex; min-width: 0; min-height: 0; flex-direction: column; grid-column: 2; grid-row: 1; }
.workspace-header { display: flex; min-height: 70px; align-items: center; justify-content: space-between; padding: 0 16px; background: #f5f5f5; }
.preview-pill { width: 150px; height: 38px; background: #bdbdbd; }
.workspace-content { flex: 1; padding: 24px 20px; }
.workspace-toolbar { display: flex; min-height: 72px; align-items: center; gap: 12px; border-top: 1px solid #ddd; background: #f5f5f5; padding: 8px 12px; }
.workspace-toolbar :deep(.v-btn) { width: 48px; height: 48px; border-radius: 50%; background: white; box-shadow: 0 2px 5px #0002; }
.workspace-footer { grid-column: 1 / -1; grid-row: 2; padding: 10px 24px; color: white; background: #222; }
.empty-workspace { padding: 0 0 0 0; }
@media (max-width: 800px) { .builder-shell { grid-template-columns: minmax(250px, 34%) minmax(0, 1fr); } }
</style>
