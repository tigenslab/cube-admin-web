<script setup lang="ts">
import type { ApiFormSchema } from '~/types/api-form'

interface VjsfPayload {
  schema: ApiFormSchema
  model: any
}

const props = defineProps<{
  modelValue: boolean
  title: string
  loadKey: string | number | null
  loadForm: () => Promise<{ vjsf: VjsfPayload }>
  saveForm: (model: any) => Promise<unknown>
}>()

const api = useApi()
const config = useRuntimeConfig()
const appOrigin = useRequestURL().origin
const vjsfOptions = {
  fetchBaseURL: config.public.apiBase,
  fetch: (url: string, options: RequestInit) => {
    const requestUrl = new URL(url)
    const apiUrl = requestUrl.origin === appOrigin
      ? `${requestUrl.pathname}${requestUrl.search}`
      : url
    return api(apiUrl, options)
  },
}

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [value: unknown]
}>()

const form = ref<VjsfPayload | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
let requestVersion = 0

watch(() => [props.modelValue, props.loadKey] as const, async ([opened, loadKey]) => {
  const currentRequest = ++requestVersion
  error.value = ''

  if (!opened || loadKey === null) {
    form.value = null
    loading.value = false
    return
  }

  form.value = null
  loading.value = true
  try {
    const response = await props.loadForm()
    if (currentRequest === requestVersion) {
      form.value = response.vjsf
    }
  } catch (cause) {
    if (currentRequest === requestVersion) error.value = getApiErrorMessage(cause, 'Unable to load form.')
  } finally {
    if (currentRequest === requestVersion) loading.value = false
  }
}, { immediate: true })

async function submit() {
  if (!form.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    const saved = await props.saveForm(form.value.model)
    emit('saved', saved)
    emit('update:modelValue', false)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to save changes.')
  } finally {
    saving.value = false
  }
}

</script>

<template>
  <VDialog :model-value="modelValue" max-width="640" @update:model-value="emit('update:modelValue', $event)">
    <VCard rounded="xl">
      <VCardTitle class="pa-6 pb-2">{{ title }}</VCardTitle>
      <VCardText class="pa-6 pt-2">
        <VProgressLinear v-if="loading" class="mb-4" color="primary" indeterminate />
        <VAlert v-if="error" class="mb-4" color="error" density="compact" variant="tonal">{{ error }}</VAlert>
        <VForm v-if="form" @submit.prevent="submit">
          <FormsVjsfForm v-if="form" :key="loadKey ?? ''" v-model="form.model" :options="vjsfOptions" :schema="form.schema" />
          <div class="d-flex justify-end ga-3 mt-4">
            <VBtn :disabled="saving" variant="text" @click="emit('update:modelValue', false)">Cancel</VBtn>
            <VBtn color="primary" :loading="saving" type="submit">Save changes</VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>
</template>
