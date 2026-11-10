<script setup lang="ts">
import type { CoursePackage } from '~/stores/packages'
import type { ApiFormSchema } from '~/types/api-form'

const coursesStore = useCoursesStore()
const packagesApi = usePackagesStore()
const route = useRoute()
const router = useRouter()
const packages = ref<CoursePackage[]>([])
const packagesLoading = ref(true)
const formLoading = ref(false)
const formSchema = ref<ApiFormSchema | null>(null)
const packageSelectionSchema = ref<ApiFormSchema | null>(null)
const formPackageId = ref('')
const form = ref<{ package_id: string; title: string; code: string; level?: number }>({ package_id: '', title: '', code: '' })
const submitting = ref(false)
const error = ref<string | null>(null)

const selectedPackage = computed(() => packages.value.find(item => item.id === form.value.package_id) || null)
const vjsfSchema = computed<ApiFormSchema | null>(() => {
  if (selectedPackage.value && formPackageId.value === selectedPackage.value.id && formSchema.value) {
    return {
      ...formSchema.value,
      properties: {
        ...formSchema.value.properties,
        package_id: { ...formSchema.value.properties?.package_id, const: selectedPackage.value.id, readOnly: true },
      },
    }
  }
  const schema = packageSelectionSchema.value
  if (!schema) return null
  return {
    ...schema,
    properties: {
      ...schema.properties,
      package_id: {
        ...schema.properties?.package_id,
        oneOf: packages.value.map(item => ({ const: item.id, title: `${item.title} (${item.type})` })),
      },
    },
  }
})

let formRequest = 0
watch(selectedPackage, async (item) => {
  const request = ++formRequest
  formPackageId.value = ''
  if (!item) {
    formSchema.value = packageSelectionSchema.value
    return
  }

  formLoading.value = true
  error.value = null
  try {
    const { vjsf } = await coursesStore.newForm(item.id)
    if (request !== formRequest) return
    formSchema.value = vjsf.schema
    formPackageId.value = item.id
    form.value = {
      package_id: item.id,
      title: '',
      code: '',
      ...vjsf.model,
    }
  } catch (cause) {
    if (request === formRequest) error.value = getApiErrorMessage(cause, 'Unable to load the course form.')
  } finally {
    if (request === formRequest) formLoading.value = false
  }
})

onMounted(async () => {
  packagesLoading.value = true
  try {
    const [packageData, { vjsf }] = await Promise.all([packagesApi.list(), coursesStore.newForm()])
    packageSelectionSchema.value = vjsf.schema
    formSchema.value = vjsf.schema
    packages.value = packageData.items
    const requestedPackageId = String(route.query.package_id || '')
    if (packages.value.some(item => item.id === requestedPackageId)) form.value.package_id = requestedPackageId
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load packages.')
  } finally {
    packagesLoading.value = false
  }
})

async function submit() {
  const packageId = String(form.value?.package_id ?? '').trim()
  const packageType = selectedPackage.value?.type
  const title = String(form.value?.title ?? '').trim()
  const code = String(form.value?.code ?? '').trim()
  const level = Number(form.value?.level)
  if (!packageId || !packageType) {
    error.value = 'Select a package.'
    return
  }

  submitting.value = true
  error.value = null
  try {
    await coursesStore.create({
      package_id: packageId,
      ...(packageType.startsWith('SCH:') ? { level } : { title, code }),
    })
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
        <FormsVjsfForm v-if="vjsfSchema" v-model="form" :schema="vjsfSchema" />
        <div class="d-flex justify-end ga-3">
          <VBtn to="/courses" variant="text">Cancel</VBtn>
          <VBtn color="primary" :disabled="packagesLoading || formLoading || !vjsfSchema" :loading="submitting || formLoading" type="button" @click="submit">Create course</VBtn>
        </div>
      </VForm>
    </VCardText>
  </VCard>
</template>
