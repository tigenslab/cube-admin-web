<script setup lang="ts">
import type { CatalogueCourse, CataloguePackage } from '~/stores/catalogue'
import { displayCourseCode, displayCourseTitle } from '~/utils/course-display'

const route = useRoute()
const catalogueApi = useCatalogueStore()
const item = ref<CataloguePackage | null>(null)
const courses = ref<CatalogueCourse[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await catalogueApi.package(String(route.params.id))
    item.value = response.item
    courses.value = response.courses
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load this package.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <VBtn class="mb-5" prepend-icon="mdi-arrow-left" to="/catalogue" variant="text">Catalogue</VBtn>
  <VProgressLinear v-if="loading" class="mb-5" color="primary" indeterminate />
  <VAlert v-if="error" class="mb-5" color="error" variant="tonal">{{ error }} <VBtn size="small" variant="text" @click="load">Retry</VBtn></VAlert>

  <template v-if="item">
    <VCard class="mb-8 overflow-hidden" rounded="xl" variant="flat">
      <VImg v-if="item.metadata?.thumbnail_url" cover height="260" :src="item.metadata.thumbnail_url" />
      <div v-else class="package-hero d-flex align-center justify-center" :class="`type-${item.type.replace(':', '-')}`">
        <VIcon color="white" icon="mdi-folder-open-outline" size="72" />
      </div>
      <VCardText class="pa-6">
        <div class="text-overline text-primary font-weight-bold">{{ item.type_label }} · {{ item.code }}</div>
        <div class="d-flex flex-wrap align-center justify-space-between ga-3">
          <h1 class="text-h4 font-weight-bold">{{ item.title }}</h1>
          <VChip color="primary" prepend-icon="mdi-book-open-page-variant-outline" variant="tonal">{{ courses.length }} courses</VChip>
        </div>
        <p v-if="item.description" class="text-body-1 text-medium-emphasis mt-3">{{ item.description }}</p>
      </VCardText>
    </VCard>

    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h2 class="text-h5 font-weight-bold">Courses</h2>
        <p class="text-body-2 text-medium-emphasis">Select a course to view its content.</p>
      </div>
    </div>
    <VRow v-if="courses.length">
      <VCol v-for="course in courses" :key="course.id" cols="12" md="6" xl="4">
        <VCard class="h-100" :to="`/catalogue/courses/${encodeURIComponent(course.id)}`" rounded="xl" variant="flat">
          <VCardItem class="pa-5">
            <template #prepend><VAvatar class="mr-3" color="secondary" rounded="lg" variant="tonal"><VIcon icon="mdi-book-open-page-variant-outline" /></VAvatar></template>
            <template #title>{{ displayCourseTitle(course) }}</template>
            <template #subtitle>{{ displayCourseCode(course) }}</template>
            <template #append><VIcon icon="mdi-chevron-right" /></template>
          </VCardItem>
        </VCard>
      </VCol>
    </VRow>
    <VCard v-else class="pa-7 text-center text-body-2 text-medium-emphasis" rounded="xl" variant="flat">
      No published courses are available in this package yet.
    </VCard>
  </template>
</template>

<style scoped>
.package-hero { height: 260px; background: linear-gradient(135deg, #4659a8, #8ba5e8); }
.type-SCH-PRY { background: linear-gradient(135deg, #2f7c83, #8cc9bc); }
.type-SCH-SEC { background: linear-gradient(135deg, #4357a6, #8ea8ec); }
.type-RTO-NRT { background: linear-gradient(135deg, #965b28, #e6ae60); }
.type-RTO-NAT { background: linear-gradient(135deg, #6c4d9a, #b79be1); }
</style>
