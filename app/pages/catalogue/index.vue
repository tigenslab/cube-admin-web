<script setup lang="ts">
import type { CatalogueCourse, CataloguePackage } from '~/stores/catalogue'
import type { PackageType } from '~/stores/packages'

const catalogueApi = useCatalogueStore()
const packages = ref<CataloguePackage[]>([])
const courses = ref<CatalogueCourse[]>([])
const courseTypes = ref<PackageType[]>([])
const search = ref('')
const loading = ref(true)
const error = ref('')

const categories: { type: PackageType; title: string; description: string; icon: string }[] = [
  { type: 'SCH:V9', title: 'School V9', description: 'Courses for school year levels.', icon: 'mdi-school' },
  { type: 'RTO:NRT', title: 'Nationally Recognised Training', description: 'Accredited training and qualifications.', icon: 'mdi-certificate-outline' },
  { type: 'RTO:NAT', title: 'Non-accredited Training', description: 'Other training courses.', icon: 'mdi-lightbulb-outline' },
]

const packagesByCategory = computed(() => {
  const query = search.value.trim().toLowerCase()
  return categories.filter(category => courseTypes.value.includes(category.type)).map(category => ({
    ...category,
    packages: packages.value.filter(item => item.type === category.type)
      .filter(item => !query || `${item.code} ${item.title} ${item.description || ''}`.toLowerCase().includes(query)),
  })).filter(category => category.packages.length > 0 || !query)
})

function courseCount(packageId: string, packageType: PackageType) {
  return courses.value.filter(course => String(course.package_id) === String(packageId) && course.type === packageType).length
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await catalogueApi.list()
    packages.value = response.items
    courses.value = response.courses
    courseTypes.value = response.course_types
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load the catalogue.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="page-header mb-8">
    <div>
      <div class="text-overline text-primary font-weight-bold">LEARNING</div>
      <h1 class="text-h4 font-weight-bold mt-1">Catalogue</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">Browse available learning packages and courses.</p>
    </div>
  </section>

  <VAlert v-if="error" class="mb-5" color="error" variant="tonal">
    {{ error }} <VBtn size="small" variant="text" @click="load">Retry</VBtn>
  </VAlert>

  <VTextField
    v-model="search"
    class="catalogue-search mb-8"
    clearable
    hide-details
    label="Search packages"
    prepend-inner-icon="mdi-magnify"
    rounded="lg"
    variant="solo-filled"
  />

  <VProgressLinear v-if="loading" class="mb-4" color="primary" indeterminate />

  <section v-for="category in packagesByCategory" :key="category.type" class="mb-10">
    <div class="d-flex align-center ga-3 mb-4">
      <VAvatar color="primary" rounded="lg" variant="tonal"><VIcon :icon="category.icon" /></VAvatar>
      <div>
        <h2 class="text-h5 font-weight-bold">{{ category.title }}</h2>
        <p class="text-body-2 text-medium-emphasis">{{ category.description }}</p>
      </div>
      <VSpacer />
      <VChip size="small" variant="tonal">{{ category.packages.length }} packages</VChip>
    </div>

    <VRow>
      <VCol v-for="item in category.packages" :key="item.id" cols="12" sm="6" xl="4">
        <VCard class="package-card h-100" :to="`/catalogue/packages/${encodeURIComponent(item.id)}`" rounded="xl" variant="flat">
          <VImg v-if="item.metadata?.thumbnail_url" cover height="180" :src="item.metadata.thumbnail_url" />
          <div v-else class="package-thumbnail d-flex align-center justify-center" :class="`type-${item.type.replace(':', '-')}`">
            <VIcon color="white" icon="mdi-folder-open-outline" size="56" />
          </div>
          <VCardItem class="pa-5 pb-2">
            <template #title>{{ item.title }}</template>
            <template #subtitle>{{ item.description || item.code }}</template>
            <template #append><VChip size="small" variant="tonal">{{ item.code }}</VChip></template>
          </VCardItem>
          <VCardText class="d-flex align-center justify-space-between pt-1">
            <span class="text-body-2 text-medium-emphasis">{{ courseCount(item.id, item.type) }} courses</span>
            <VBtn aria-label="View package" icon="mdi-arrow-right" size="small" variant="text" />
          </VCardText>
        </VCard>
      </VCol>
      <VCol v-if="!category.packages.length" cols="12">
        <VCard class="pa-6 text-body-2 text-medium-emphasis" rounded="xl" variant="flat">No matching packages.</VCard>
      </VCol>
    </VRow>
  </section>

  <VCard v-if="!loading && !error && packagesByCategory.every(category => !category.packages.length)" class="pa-8 text-center" rounded="xl" variant="flat">
    <VIcon class="mb-3" color="medium-emphasis" icon="mdi-bookshelf" size="40" />
    <div class="text-h6">{{ search ? 'No matches found' : 'No packages available' }}</div>
    <div class="text-body-2 text-medium-emphasis mt-1">{{ search ? 'Try another search term.' : 'There are no packages available for your account yet.' }}</div>
  </VCard>
</template>

<style scoped>
.page-header { align-items: flex-end; display: flex; justify-content: space-between; }
.catalogue-search { max-width: 560px; }
.package-card { overflow: hidden; transition: transform 160ms ease, box-shadow 160ms ease; }
.package-card:hover { box-shadow: 0 10px 28px #172b4d1a; transform: translateY(-2px); }
.package-thumbnail { height: 180px; background: linear-gradient(135deg, #4659a8, #8ba5e8); }
.type-SCH-PRY { background: linear-gradient(135deg, #2f7c83, #8cc9bc); }
.type-SCH-SEC { background: linear-gradient(135deg, #4357a6, #8ea8ec); }
.type-RTO-NRT { background: linear-gradient(135deg, #965b28, #e6ae60); }
.type-RTO-NAT { background: linear-gradient(135deg, #6c4d9a, #b79be1); }
</style>
