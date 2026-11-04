<script setup lang="ts">
import type { CatalogueBlock, CatalogueCourseContent, CatalogueOutlineRow } from '~/composables/useCatalogueApi'

const route = useRoute()
const catalogueApi = useCatalogueApi()
const detail = ref<CatalogueCourseContent | null>(null)
const loading = ref(true)
const error = ref('')

const unitSnapshots = computed(() => new Map((detail.value?.units || []).map(item => [item.unit_id, item])))

function unitRows(rows: CatalogueOutlineRow[], result: { id: string; title: string; unitId: string }[] = []) {
  for (const row of rows) {
    if (row.type === 'U' && row.unit_id) {
      const unit = unitSnapshots.value.get(row.unit_id)?.unit
      result.push({ id: row.id, title: unit?.title || row.title || 'Untitled unit', unitId: row.unit_id })
    }
    unitRows(row.children || [], result)
  }
  return result
}

const units = computed(() => unitRows(detail.value?.course_units || []))

function flattenBlocks(blocks: CatalogueBlock[], result: CatalogueBlock[] = []) {
  for (const block of blocks) {
    result.push(block)
    flattenBlocks(block.children || [], result)
  }
  return result
}

function contentText(value?: Record<string, unknown>) {
  if (!value) return ''
  const primary = value.description ?? value.text ?? value.body ?? value.title
  if (typeof primary === 'string') return primary
  return JSON.stringify(value, null, 2)
}

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
        <div class="text-overline text-primary font-weight-bold">{{ detail.course.type }} · {{ detail.course.code }}</div>
        <h1 class="text-h4 font-weight-bold mt-1">{{ detail.course.title }}</h1>
        <p v-if="detail.course.description" class="text-body-1 text-medium-emphasis mt-2">{{ detail.course.description }}</p>
      </div>
      <VChip prepend-icon="mdi-book-open-page-variant-outline" variant="tonal">Version {{ detail.version }}</VChip>
    </section>

    <VCard rounded="xl" variant="flat">
      <VCardItem class="pa-6">
        <template #title>Course content</template>
        <template #subtitle>{{ units.length }} units</template>
      </VCardItem>
      <VCardText v-if="!units.length" class="pa-6 pt-0 text-body-2 text-medium-emphasis">No units are included in this course yet.</VCardText>
      <VExpansionPanels v-else class="px-4 pb-4" multiple variant="accordion">
        <VExpansionPanel v-for="(row, index) in units" :key="row.id" :value="row.id">
          <VExpansionPanelTitle>
            <div>
              <div class="text-overline text-medium-emphasis">Unit {{ index + 1 }} · {{ unitSnapshots.get(row.unitId)?.unit.code }}</div>
              <div class="text-subtitle-1 font-weight-medium">{{ row.title }}</div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p v-if="unitSnapshots.get(row.unitId)?.unit.content?.description" class="text-body-1 mb-5">
              {{ unitSnapshots.get(row.unitId)?.unit.content?.description }}
            </p>
            <div v-for="block in flattenBlocks(unitSnapshots.get(row.unitId)?.blocks || [])" :key="block.id" class="mb-5">
              <h3 class="text-h6 mb-2">{{ block.title || block.content?.title || block.type }}</h3>
              <p v-if="contentText(block.content)" class="text-body-1 content-text">{{ contentText(block.content) }}</p>
              <VCard v-for="component in block.components || []" :key="component.id" class="mt-3" rounded="lg" variant="outlined">
                <VCardTitle class="text-subtitle-2">{{ component.type }}</VCardTitle>
                <VCardText class="content-text">{{ contentText(component.content) }}</VCardText>
              </VCard>
            </div>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCard>
  </template>
</template>

<style scoped>
.page-header { align-items: flex-end; display: flex; justify-content: space-between; gap: 24px; }
.content-text { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
