<script setup lang="ts">
import type { CourseResourceItem } from '~/types/course-resources'
import type { UnitViewerTreeNode } from '~/components/course-content/UnitViewerTree.vue'
import UnitViewerTree from '~/components/course-content/UnitViewerTree.vue'

const route = useRoute()
const router = useRouter()
const courseId = String(route.params.id)
const unitId = String(route.params.unitId)
const unitsApi = useUnitsApi()
const unitBlocksApi = useUnitBlocksApi()
const unit = ref<CourseResourceItem | null>(null)
const blocks = ref<CourseResourceItem[]>([])
const activeBlockId = ref<string | null>(null)
const openGroups = ref<string[]>([])
const loading = ref(true)
const error = ref('')

const activeBlock = computed(() => blocks.value.find(block => block.id === activeBlockId.value) || null)
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

function blockPath(blockId: string) {
  return `/courses/${encodeURIComponent(courseId)}/units/${encodeURIComponent(unitId)}/view/blocks/${encodeURIComponent(blockId)}`
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
  try {
    const [unitData, blockData] = await Promise.all([
      unitsApi.list(courseId),
      unitBlocksApi.list(courseId, unitId),
    ])
    unit.value = unitData.items.find(item => item.id === unitId) || null
    if (!unit.value) throw new Error('Unit not found.')
    blocks.value = blockData.items
    openGroups.value = blocks.value
      .filter(block => ['UnitBlock::Group', 'UnitBlock::Theory', 'UnitBlock::Assessment'].includes(block.type))
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
      await router.replace(`/courses/${courseId}/units/${unitId}/view`)
    }
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load unit content.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="viewer-shell">
    <aside class="viewer-sidebar">
      <div class="unit-heading">
        <VBtn aria-label="Back to course view" icon="mdi-chevron-left" :to="`/courses/${courseId}/view`" variant="text" />
        <div class="unit-heading-text">
          <div>{{ unit?.code }}</div>
          <strong>{{ unit?.title }}</strong>
        </div>
        <VMenu location="end">
          <template #activator="{ props }">
            <VBtn v-bind="props" aria-label="Unit view actions" icon="mdi-dots-vertical" variant="text" />
          </template>
          <VList>
            <VListItem prepend-icon="mdi-pencil-outline" title="Edit unit" :to="`/courses/${courseId}/units/${unitId}/edit`" />
            <VDivider class="my-1" />
            <VListItem prepend-icon="mdi-arrow-left" title="Course view" :to="`/courses/${courseId}/view`" />
          </VList>
        </VMenu>
      </div>

      <VProgressLinear v-if="loading" color="primary" indeterminate />
      <VAlert v-if="error" class="ma-3" color="error" density="compact" variant="tonal">{{ error }}</VAlert>
      <div class="viewer-tree">
        <div v-if="!loading && !tree.length && !error" class="pa-5 text-body-2 text-medium-emphasis">No unit blocks.</div>
        <VList v-else v-model:opened="openGroups" density="comfortable" nav>
          <UnitViewerTree :nodes="tree" :active-id="activeBlockId" :title="blockTitle" @select="selectBlock" />
        </VList>
      </div>
      <div class="viewer-account"><SessionAccountMenu /></div>
    </aside>

    <main class="viewer-main">
      <header class="viewer-header">
        <strong>{{ activeBlock ? blockTitle(activeBlock) : unit?.title }}</strong>
        <VBtn aria-label="Preview unit" class="preview-pill" rounded="pill" />
      </header>
      <section class="viewer-content">
        <template v-if="activeBlock">
          <h1 class="text-h5 font-weight-bold">{{ blockTitle(activeBlock) }}</h1>
          <div class="text-body-2 text-medium-emphasis mt-2">{{ activeBlock.type }}</div>
          <VCard class="mt-6" min-height="240" rounded="lg" variant="outlined">
            <VCardText class="pa-6">
              <div v-if="activeBlock.content?.description">{{ activeBlock.content.description }}</div>
              <div v-else class="text-medium-emphasis">No content available.</div>
            </VCardText>
          </VCard>
        </template>
        <div v-else class="text-medium-emphasis">Select a block from the outline.</div>
      </section>
      <div class="viewer-toolbar">
        <VBtn aria-label="Block list" icon="mdi-format-list-bulleted" variant="flat" />
        <VBtn aria-label="Help" icon="mdi-help-circle-outline" variant="flat" />
        <VBtn aria-label="Files" icon="mdi-folder-outline" variant="flat" />
        <VBtn aria-label="More tools" icon="mdi-menu" variant="flat" />
      </div>
    </main>
    <footer class="viewer-footer">© 2025 Cube</footer>
  </div>
</template>

<style scoped>
.viewer-shell { display: grid; grid-template-columns: 390px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) 42px; height: 100vh; background: #fff; }
.viewer-sidebar { display: flex; min-height: 0; flex-direction: column; grid-column: 1; grid-row: 1; border-right: 1px solid #ddd; }
.unit-heading { display: flex; align-items: center; gap: 8px; margin: 8px; padding: 8px; background: #f0f0f0; }
.unit-heading-text { flex: 1; min-width: 0; font-size: 14px; }
.unit-heading-text strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.viewer-tree { flex: 1; min-height: 0; overflow: auto; }
.viewer-account { display: flex; min-height: 56px; align-items: center; border-top: 1px solid #eee; padding: 4px 8px; }
.viewer-account :deep(.account-button) { justify-content: flex-start; width: 100%; }
.viewer-main { display: flex; min-width: 0; min-height: 0; flex-direction: column; grid-column: 2; grid-row: 1; }
.viewer-header { display: flex; min-height: 70px; align-items: center; justify-content: space-between; padding: 0 16px; background: #f5f5f5; }
.preview-pill { width: 150px; height: 38px; background: #bdbdbd; }
.viewer-content { flex: 1; overflow: auto; padding: 24px 20px; }
.viewer-toolbar { display: flex; min-height: 72px; align-items: center; gap: 12px; border-top: 1px solid #ddd; background: #f5f5f5; padding: 8px 12px; }
.viewer-toolbar :deep(.v-btn) { width: 48px; height: 48px; border-radius: 50%; background: white; box-shadow: 0 2px 5px #0002; }
.viewer-footer { grid-column: 1 / -1; grid-row: 2; padding: 10px 24px; color: white; background: #222; }
@media (max-width: 800px) { .viewer-shell { grid-template-columns: minmax(250px, 34%) minmax(0, 1fr); } }
</style>
