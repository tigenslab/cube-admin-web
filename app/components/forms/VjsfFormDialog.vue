<script setup lang="ts">
interface VjsfPayload {
  schema: Record<string, unknown>
  model: any
}

const props = defineProps<{
  modelValue: boolean
  title: string
  loadKey: string | number | null
  loadForm: () => Promise<{ vjsf: VjsfPayload }>
  saveForm: (model: any) => Promise<unknown>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [value: unknown]
}>()

const form = ref<VjsfPayload | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const vjsfLoadError = ref('')
const vjsfTimedOut = ref(false)
let layoutTimer: ReturnType<typeof setTimeout> | undefined
const Vjsf = defineAsyncComponent({
  loader: () => import('@koumoul/vjsf'),
  onError(cause, _retry, fail) {
    vjsfLoadError.value = getApiErrorMessage(cause, 'VJSF could not be loaded.')
    fail()
  },
})
const properties = computed(() => Object.entries(
  (form.value?.schema.properties ?? {}) as Record<string, { title?: string; type?: string; format?: string; enum?: unknown[] }>,
).map(([key, schema]) => ({ key, ...schema })))
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
  vjsfLoadError.value = ''
  vjsfTimedOut.value = false
  clearTimeout(layoutTimer)
  try {
    const response = await props.loadForm()
    if (currentRequest === requestVersion) {
      form.value = response.vjsf
      layoutTimer = setTimeout(() => {
        vjsfTimedOut.value = true
      }, 1500)
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

function setObjectField(key: string, rawValue: string) {
  if (!form.value) return
  try {
    form.value.model[key] = rawValue.trim() ? JSON.parse(rawValue) : {}
  } catch {
    // Leave the existing value in place while the JSON is invalid.
  }
}

function objectFieldValue(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
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
          <Vjsf v-if="!vjsfLoadError && !vjsfTimedOut" :key="loadKey ?? ''" v-model="form.model" :schema="form.schema" />
          <div v-if="vjsfLoadError || vjsfTimedOut">
            <VAlert v-if="vjsfLoadError" class="mb-4" color="warning" density="compact" variant="tonal">{{ vjsfLoadError }} Showing the schema fields with standard inputs.</VAlert>
            <template v-for="field in properties" :key="field.key">
              <VSelect
                v-if="field.enum"
                v-model="form.model[field.key]"
                :items="field.enum"
                :label="field.title || field.key"
                required
              />
              <VCombobox
                v-else-if="field.type === 'array'"
                v-model="form.model[field.key]"
                chips
                :label="field.title || field.key"
                multiple
              />
              <VTextarea
                v-else-if="field.type === 'object'"
                :label="field.title || field.key"
                :model-value="objectFieldValue(form.model[field.key])"
                @update:model-value="setObjectField(field.key, $event)"
              />
              <VTextField
                v-else
                v-model="form.model[field.key]"
                :label="field.title || field.key"
                :type="field.format === 'email' ? 'email' : field.format === 'password' ? 'password' : field.type === 'integer' || field.type === 'number' ? 'number' : 'text'"
                required
              />
            </template>
          </div>
          <div class="d-flex justify-end ga-3 mt-4">
            <VBtn :disabled="saving" variant="text" @click="emit('update:modelValue', false)">Cancel</VBtn>
            <VBtn color="primary" :loading="saving" type="submit">Save changes</VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>
</template>
