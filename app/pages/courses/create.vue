<script setup lang="ts">
import type { CoursePackage } from '~/composables/usePackagesApi'
import type { ApiFormSchema } from '~/types/api-form'

const coursesStore = useCoursesStore()
const packagesApi = usePackagesApi()
const Vjsf = defineAsyncComponent(() => import('@koumoul/vjsf'))
const route = useRoute()
const router = useRouter()
const packages = ref<CoursePackage[]>([])
const packagesLoading = ref(true)
const formSchema = ref<ApiFormSchema | null>(null)
const form = ref({ package_id: '', title: '', code: '', type: '' })
const submitting = ref(false)
const error = ref<string | null>(null)

const selectedPackage = computed(() => packages.value.find(item => item.id === form.value.package_id) || null)
const courseTypes = computed(() => formSchema.value?.properties?.type?.enum ?? [])
const vjsfSchema = computed<ApiFormSchema | null>(() => {
  if (!formSchema.value) return null
  return {
    ...formSchema.value,
    properties: {
      ...formSchema.value.properties,
      package_id: {
        ...formSchema.value.properties?.package_id,
        oneOf: packages.value.map(item => ({ const: item.id, title: `${item.title} (${item.type})` })),
      },
    },
  }
})

watch(selectedPackage, (item) => { form.value.type = item?.type || '' })

onMounted(async () => {
  packagesLoading.value = true
  try {
    const [packageData, { vjsf }] = await Promise.all([packagesApi.list(), coursesStore.newForm()])
    formSchema.value = vjsf.schema
    Object.assign(form.value, vjsf.model)
    packages.value = packageData.items.filter(item => courseTypes.value.includes(item.type))
    const requestedPackageId = String(route.query.package_id || '')
    if (packages.value.some(item => item.id === requestedPackageId)) form.value.package_id = requestedPackageId
    form.value.type = selectedPackage.value?.type || ''
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load packages.')
  } finally {
    packagesLoading.value = false
  }
})

async function submit() {
  const packageId = String(form.value?.package_id ?? '').trim()
  const title = String(form.value?.title ?? '').trim()
  const code = String(form.value?.code ?? '').trim()
  if (!packageId || !title || !code) {
    error.value = 'Select a package and enter a course title and code.'
    return
  }

  submitting.value = true
  error.value = null
  try {
    await coursesStore.create({ package_id: packageId, title, code, type: String(form.value?.type ?? '') })
    await router.push(`/packages/${encodeURIComponent(packageId)}`)
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
        <Vjsf v-if="vjsfSchema" v-model="form" :schema="vjsfSchema" />
        <div class="d-flex justify-end ga-3">
          <VBtn to="/courses" variant="text">Cancel</VBtn>
          <VBtn color="primary" :disabled="packagesLoading || !vjsfSchema" :loading="submitting" type="button" @click="submit">Create course</VBtn>
        </div>
      </VForm>
    </VCardText>
  </VCard>
</template>
