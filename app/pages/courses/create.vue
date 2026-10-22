<script setup lang="ts">
import type { CoursePackage } from '~/composables/usePackagesApi'

const coursesStore = useCoursesStore()
const packagesApi = usePackagesApi()
const route = useRoute()
const router = useRouter()
const packages = ref<CoursePackage[]>([])
const packagesLoading = ref(true)
const packageId = ref('')
const title = ref('')
const code = ref('')
const subType = ref('')
const status = ref('new')
const submitting = ref(false)
const error = ref<string | null>(null)

const selectedPackage = computed(() => packages.value.find(item => item.id === packageId.value) || null)
const packageOptions = computed(() => packages.value.map(item => ({
  title: `${item.title} (${item.type})`,
  value: item.id,
})))

onMounted(async () => {
  packagesLoading.value = true
  try {
    packages.value = (await packagesApi.list()).items
    const requestedPackageId = String(route.query.package_id || '')
    if (packages.value.some(item => item.id === requestedPackageId)) packageId.value = requestedPackageId
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load packages.')
  } finally {
    packagesLoading.value = false
  }
})

async function submit() {
  if (!packageId.value || !title.value.trim() || !code.value.trim() || !subType.value.trim()) return

  submitting.value = true
  error.value = null
  try {
    await coursesStore.create({ package_id: packageId.value, title: title.value.trim(), code: code.value.trim(), sub_type: subType.value.trim(), type: selectedPackage.value?.type || '', status: status.value })
    await router.push(`/packages/${encodeURIComponent(packageId.value)}`)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to create course.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="page-header mb-8">
    <div>
      <div class="text-overline text-primary font-weight-bold">LEARNING</div>
      <h1 class="text-h4 font-weight-bold mt-1">Create course</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">Add a new course to your catalogue.</p>
    </div>
  </section>

  <VCard max-width="720" rounded="xl" variant="flat">
    <VCardItem class="pa-6 pb-2">
      <template #title>Course details</template>
    </VCardItem>
    <VCardText class="pa-6">
      <VAlert v-if="error" class="mb-5" color="error" density="compact" variant="tonal">{{ error }}</VAlert>
      <VForm @submit.prevent="submit">
        <VSelect v-model="packageId" :items="packageOptions" :loading="packagesLoading" class="mb-4" label="Package" no-data-text="No packages available" required />
        <VTextField :model-value="selectedPackage?.type || ''" class="mb-4" label="Education category" readonly />
        <VTextField v-model="title" class="mb-4" label="Title" placeholder="Year 5 Mathematics" required />
        <VTextField v-model="code" class="mb-4" label="Code" placeholder="Mathematics Year 7" required />
        <VTextField v-model="subType" class="mb-4" label="Sub-type" required />
        <VSelect v-model="status" :items="['new', 'draft', 'ready', 'publish']" class="mb-4" label="Status" />
        <div class="d-flex justify-end ga-3">
          <VBtn to="/courses" variant="text">Cancel</VBtn>
          <VBtn color="primary" :disabled="!packageId" :loading="submitting" type="submit">Create course</VBtn>
        </div>
      </VForm>
    </VCardText>
  </VCard>
</template>
