<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  items?: any[]
  itemsPerPage?: number
  page?: number
  loading?: boolean
  cols?: number | string
  sm?: number | string
  md?: number | string
  lg?: number | string
  xl?: number | string
}>(), {
  items: () => [],
  itemsPerPage: 12,
  page: 1,
  loading: false,
  cols: 12,
  sm: 6,
  md: 4,
})

const emit = defineEmits<{ 'update:page': [page: number] }>()
const search = ref('')
const pageModel = ref(props.page)
watch(() => props.page, (value) => {
  pageModel.value = value
})
watch(pageModel, value => emit('update:page', value))
watch(search, () => pageModel.value = 1)
</script>

<template>
  <VDataIterator
    v-model:page="pageModel"
    :items="items"
    :items-per-page="itemsPerPage"
    :loading="loading"
    :search="search"
  >
    <template #header>
      <VToolbar class="px-2 mb-3" color="transparent">
        <VTextField
          v-model="search"
          clearable
          density="comfortable"
          hide-details
          placeholder="Search"
          prepend-inner-icon="mdi-magnify"
          style="max-width: 300px"
          variant="solo"
        />
        <VSpacer />
        <slot name="header_action" />
      </VToolbar>
    </template>

    <template #default="{ items: pageItems }">
      <VRow>
        <VCol
          v-for="(item, index) in pageItems"
          :key="item.raw?.id ?? index"
          :cols="cols"
          :lg="lg"
          :md="md"
          :sm="sm"
          :xl="xl"
        >
          <slot name="item" :item="item" />
        </VCol>
      </VRow>
    </template>

    <template #footer="{ page: currentPage, pageCount, prevPage, nextPage }">
      <div class="d-flex align-center justify-center pa-4">
        <VBtn
          aria-label="Previous page"
          :disabled="currentPage <= 1"
          density="comfortable"
          icon="mdi-arrow-left"
          rounded
          variant="tonal"
          @click="prevPage"
        />
        <div class="mx-2 text-caption">Page {{ currentPage }} of {{ pageCount }}</div>
        <VBtn
          aria-label="Next page"
          :disabled="currentPage >= pageCount"
          density="comfortable"
          icon="mdi-arrow-right"
          rounded
          variant="tonal"
          @click="nextPage"
        />
      </div>
    </template>

    <template #loader>
      <VContainer class="pa-2" fluid>
        <VRow dense>
          <VCol v-for="index in 6" :key="index" :cols="cols" :lg="lg" :md="md" :sm="sm" :xl="xl">
            <VSkeletonLoader class="border" type="image, article" />
          </VCol>
        </VRow>
      </VContainer>
    </template>
  </VDataIterator>
</template>
