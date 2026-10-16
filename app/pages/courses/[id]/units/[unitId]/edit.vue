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
const error = ref('')
const dialog = ref(false)
const editingBlock = ref<CourseContentItem | null>(null)
const form = reactive({ type: 'UnitBlock::Theory::Block', title: '', parent: '', position: '' as number | string })

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
const parentOptions = computed(() => [
  { title: 'Top level', value: '' },
  ...blocks.value
    .filter(block => block.id !== editingBlock.value?.id && !block.ancestry?.split('/').includes(editingBlock.value?.id || '\0'))
    .map(block => ({ title: `${'— '.repeat((block.ancestry?.split('/').filter(Boolean).length || 0) + 1)}${block.title || 'Untitled block'}`, value: [block.ancestry, block.id].filter(Boolean).join('/') })),
])
const blockTypes = [
  { title: 'Theory', value: 'UnitBlock::Theory' },
  { title: 'Theory block', value: 'UnitBlock::Theory::Block' },
  { title: 'Assessment', value: 'UnitBlock::Assessment' },
  { title: 'Assessment block', value: 'UnitBlock::Assessment::Block' },
  { title: 'Group', value: 'UnitBlock::Group' },
  { title: 'Block', value: 'UnitBlock' },
]

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
    if (!blocks.value.some(block => block.id === activeBlockId.value)) {
      activeBlockId.value = blocks.value.find(block => !blocks.value.some(candidate => candidate.ancestry?.split('/').includes(block.id)))?.id || null
    }
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load unit content.')
  } finally {
    loading.value = false
  }
}

function openBlockEditor(block: CourseContentItem | null = null) {
  editingBlock.value = block
  Object.assign(form, {
    type: block?.type || 'UnitBlock::Theory::Block',
    title: String(block?.content?.title ?? block?.metadata?.title ?? block?.title ?? ''),
    parent: block?.ancestry || '',
    position: block?.position ?? '',
  })
  dialog.value = true
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
    activeBlockId.value = saved.id
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
        <VBtn aria-label="Edit unit details" icon="mdi-dots-vertical" variant="text" @click="router.push(`/courses/${courseId}/edit` )" />
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
            :subtitle="`${block.type} · ${block.position || '—'}`"
            :prepend-icon="String(block.merged_content?.icon || (block.type.includes('Group') ? 'mdi-folder-outline' : 'mdi-book-outline'))"
            :style="{ paddingLeft: `${16 + (block.ancestry?.split('/').filter(Boolean).length || 0) * 20}px` }"
            @click="activeBlockId = block.id"
          >
            <template #append>
              <VBtn aria-label="Edit block" density="compact" icon="mdi-pencil-outline" size="small" variant="text" @click.stop="openBlockEditor(block)" />
              <VBtn aria-label="Delete block" density="compact" icon="mdi-delete-outline" size="small" variant="text" @click.stop="deleteBlock(block)" />
            </template>
          </VListItem>
        </VList>
      </div>

      <div class="sidebar-tools">
        <VBtn aria-label="Add block" icon="mdi-plus-box-multiple-outline" variant="flat" @click="openBlockEditor()" />
        <VBtn aria-label="Block list" icon="mdi-format-list-bulleted" variant="flat" />
        <VBtn aria-label="Help" icon="mdi-help-circle-outline" variant="flat" />
        <VBtn aria-label="Files" icon="mdi-folder-outline" variant="flat" />
        <VBtn aria-label="More tools" icon="mdi-menu" variant="flat" />
      </div>
    </aside>

    <main class="builder-workspace">
      <header class="workspace-header">
        <strong>{{ course?.title }}</strong>
        <VBtn aria-label="Preview unit" class="preview-pill" rounded="pill" />
      </header>
      <section class="workspace-content">
        <template v-if="activeBlock">
          <div class="d-flex align-center justify-space-between ga-4">
            <h1 class="text-h5 font-weight-bold">{{ blockTitle(activeBlock) }}</h1>
            <VBtn prepend-icon="mdi-pencil-outline" variant="tonal" @click="openBlockEditor(activeBlock)">Edit block</VBtn>
          </div>
          <div class="text-body-2 text-medium-emphasis mt-2">{{ activeBlock.type }} · Position {{ activeBlock.position || '—' }}</div>
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
      <footer class="workspace-footer">© 2025 Cube</footer>
    </main>
  </div>

  <VDialog v-model="dialog" max-width="560">
    <VCard rounded="xl">
      <VCardTitle class="pa-6 pb-2">{{ editingBlock ? 'Edit block' : 'Add content block' }}</VCardTitle>
      <VCardText class="pa-6 pt-2">
        <VSelect v-model="form.type" :items="blockTypes" class="mb-3" label="Block type" />
        <VTextField v-model="form.title" class="mb-3" label="Title" />
        <VSelect v-model="form.parent" :items="parentOptions" label="Parent group" />
        <VTextField v-model.number="form.position" label="Position" min="1" type="number" />
      </VCardText>
      <VCardActions class="pa-6 pt-0">
        <VSpacer />
        <VBtn variant="text" @click="dialog = false">Cancel</VBtn>
        <VBtn color="primary" :loading="saving" @click="saveBlock">Save block</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.builder-shell { display: grid; grid-template-columns: 390px minmax(0, 1fr); height: 100vh; background: #fff; }
.builder-sidebar { display: flex; min-height: 0; flex-direction: column; border-right: 1px solid #ddd; }
.unit-heading { display: flex; align-items: center; gap: 8px; margin: 8px; padding: 8px; background: #f0f0f0; }
.unit-heading-text { flex: 1; min-width: 0; font-size: 14px; }
.unit-heading-text strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.block-navigation { flex: 1; overflow: auto; padding-bottom: 12px; }
.sidebar-tools { display: flex; justify-content: space-around; gap: 8px; padding: 12px; border-top: 1px solid #ddd; }
.sidebar-tools :deep(.v-btn) { border-radius: 50%; box-shadow: 0 2px 5px #0002; }
.builder-workspace { display: flex; min-width: 0; flex-direction: column; }
.workspace-header { display: flex; min-height: 70px; align-items: center; justify-content: space-between; padding: 0 16px; background: #f5f5f5; }
.preview-pill { width: 150px; height: 38px; background: #bdbdbd; }
.workspace-content { flex: 1; padding: 24px 20px; }
.workspace-footer { padding: 12px 24px; color: white; background: #222; }
.empty-workspace { padding: 0 0 0 0; }
@media (max-width: 800px) { .builder-shell { grid-template-columns: minmax(250px, 34%) minmax(0, 1fr); } }
</style>
