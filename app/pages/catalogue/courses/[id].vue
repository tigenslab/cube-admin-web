<script setup lang="ts">
import type { CatalogueCourseContent, CatalogueOutlineRow } from '~/composables/useCatalogueApi'
import CatalogueOutline from '~/components/CatalogueOutline.vue'

const route = useRoute()
const catalogueApi = useCatalogueApi()
const detail = ref<CatalogueCourseContent | null>(null)
const loading = ref(true)
const error = ref('')

const unitSnapshots = computed(() => new Map((detail.value?.units || []).map(item => [item.unit_id, item])))

function mapOutline(rows: CatalogueOutlineRow[]): CatalogueOutlineRow[] {
  const normalizeType = (row: CatalogueOutlineRow) => row.unit_id || row.type === 'CourseUnit::Unit'
    ? 'U'
    : row.type === 'CourseUnit::Group' ? 'G' : row.type
  const decorate = (items: CatalogueOutlineRow[]): CatalogueOutlineRow[] => items.map((row) => {
    const type = normalizeType(row)
    const unit = row.unit_id ? unitSnapshots.value.get(row.unit_id)?.unit : undefined
    return {
      ...row,
      type,
      title: unit?.title || row.title || (type === 'G' ? 'Untitled group' : 'Untitled unit'),
      code: unit?.code || row.code,
      children: decorate(row.children || []),
    }
  })

  // Published snapshots already carry nested children. Preserve that exact hierarchy.
  if (rows.some(row => row.children?.length)) return decorate(rows)

  const flattened: CatalogueOutlineRow[] = []
  const flatten = (items: CatalogueOutlineRow[], inheritedAncestry = '') => {
    for (const row of items) {
      const type = normalizeType(row)
      const ancestry = row.ancestry ?? inheritedAncestry
      flattened.push({ ...row, type, ancestry, children: [] })
      if (row.children?.length) {
        const childAncestry = type === 'G' ? [ancestry, row.id].filter(Boolean).join('/') : ancestry
        flatten(row.children, childAncestry)
      }
    }
  }
  flatten(rows)

  const nodes = new Map<string, CatalogueOutlineRow>()
  const roots: CatalogueOutlineRow[] = []
  for (const row of flattened) {
    const unit = row.unit_id ? unitSnapshots.value.get(row.unit_id)?.unit : undefined
    nodes.set(row.id, {
      ...row,
      title: unit?.title || row.title || (row.type === 'G' ? 'Untitled group' : 'Untitled unit'),
      code: unit?.code || row.code,
      children: [],
    })
  }
  for (const row of flattened) {
    const node = nodes.get(row.id)!
    const parentId = row.ancestry?.split('/').filter(Boolean).at(-1)
    const parent = parentId ? nodes.get(parentId) : undefined
    if (parent?.type === 'G') parent.children!.push(node)
    else roots.push(node)
  }
  return roots
}

const outline = computed(() => mapOutline(detail.value?.course_units || []))
function countUnits(rows: CatalogueOutlineRow[]): number {
  return rows.reduce((count, row) => count + (row.type === 'U' || row.type === 'CourseUnit::Unit' || Boolean(row.unit_id) ? 1 : 0) + countUnits(row.children || []), 0)
}
const unitCount = computed(() => countUnits(outline.value))

async function load() {
  loading.value = true
  error.value = ''
  try {
    detail.value = await catalogueApi.course(String(route.params.id))
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load this course.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <VBtn class="mb-5" prepend-icon="mdi-arrow-left" :to="detail?.course.package_id ? `/catalogue/packages/${encodeURIComponent(detail.course.package_id)}` : '/catalogue'" variant="text">Back to package</VBtn>
  <VProgressLinear v-if="loading" class="mb-5" color="primary" indeterminate />
  <VAlert v-if="error" class="mb-5" color="error" variant="tonal">{{ error }} <VBtn size="small" variant="text" @click="load">Retry</VBtn></VAlert>

  <template v-if="detail">
    <section class="page-header mb-8">
      <div>
        <div class="text-overline text-primary font-weight-bold">{{ detail.course.type_label }} · {{ detail.course.code }}</div>
        <h1 class="text-h4 font-weight-bold mt-1">{{ detail.course.title }}</h1>
        <p v-if="detail.course.description" class="text-body-1 text-medium-emphasis mt-2">{{ detail.course.description }}</p>
      </div>
      <VChip prepend-icon="mdi-book-open-page-variant-outline" variant="tonal">Version {{ detail.version }}</VChip>
    </section>

    <VCard rounded="xl" variant="flat">
      <VCardItem class="pa-6">
        <template #title>Course units</template>
        <template #subtitle>{{ unitCount }} units</template>
      </VCardItem>
      <VCardText v-if="!unitCount" class="pa-6 pt-0 text-body-2 text-medium-emphasis">No units are included in this course yet.</VCardText>
      <CatalogueOutline v-else class="px-4 pb-4" :rows="outline" :units="detail.units" />
    </VCard>
  </template>
</template>

<style scoped>
.page-header { align-items: flex-end; display: flex; justify-content: space-between; gap: 24px; }
</style>
