<script setup lang="ts">
import type { CoursePackage, PackageType } from '~/composables/usePackagesApi'

const packagesApi = usePackagesApi()
const packages = ref<CoursePackage[]>([])
const search = ref('')
const loading = ref(true)
const error = ref('')

const categories: { type: PackageType; title: string; description: string }[] = [
  { type: 'SCHOOL::PRIMARY', title: 'Primary school', description: 'Subject packages for primary year levels.' },
  { type: 'SCHOOL::SECONDARY', title: 'Secondary school', description: 'Subject packages for secondary year levels.' },
  { type: 'RTO::NRT', title: 'Nationally recognised training', description: 'Accredited training packages and qualifications.' },
  { type: 'RTO::NON_NRT', title: 'Non nationally recognised training', description: 'Other RTO training packages.' },
]

const packagesByCategory = computed(() => {
  const query = search.value.trim().toLowerCase()
  return categories.map(category => ({
    ...category,
    packages: packages.value.filter(item => item.type === category.type)
      .filter(item => !query || `${item.code} ${item.title} ${item.description || ''}`.toLowerCase().includes(query)),
  }))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await packagesApi.list()
    packages.value = response.items
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load packages.')
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
      <h1 class="text-h4 font-weight-bold mt-1">Packages</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">Browse subject and training packages by education category.</p>
    </div>
  </section>

  <VAlert v-if="error" class="mb-5" color="error" variant="tonal">
    {{ error }} <VBtn size="small" variant="text" @click="load">Retry</VBtn>
  </VAlert>

  <VTextField
    v-model="search"
    class="package-search mb-6"
    clearable
    hide-details
    label="Search packages"
    prepend-inner-icon="mdi-magnify"
    rounded="lg"
    variant="solo-filled"
  />

  <VProgressLinear v-if="loading" class="mb-4" color="primary" indeterminate />

  <VRow>
    <VCol v-for="category in packagesByCategory" :key="category.type" cols="12" lg="6">
      <VCard class="h-100" rounded="xl" variant="flat">
        <VCardItem class="pa-6 pb-3">
          <template #title>{{ category.title }}</template>
          <template #subtitle>{{ category.packages.length }} packages · {{ category.description }}</template>
          <template #append><VChip size="small" variant="tonal">{{ category.type }}</VChip></template>
        </VCardItem>
        <VList v-if="category.packages.length" lines="two">
          <VListItem v-for="item in category.packages" :key="item.id" :title="item.title" :subtitle="item.description || item.code">
            <template #prepend>
              <VAvatar color="primary" rounded="lg" variant="tonal"><VIcon icon="mdi-folder-multiple-outline" /></VAvatar>
            </template>
            <template #append><VChip size="small" variant="outlined">{{ item.code }}</VChip></template>
          </VListItem>
        </VList>
        <VCardText v-else class="text-body-2 text-medium-emphasis pa-6">
          {{ loading ? 'Loading packages…' : 'No packages in this category.' }}
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style scoped>
.page-header { align-items: flex-end; display: flex; justify-content: space-between; }
.package-search { max-width: 520px; }
</style>
