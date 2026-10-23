<script setup lang="ts">
import type { ApiFormSchema } from '~/types/api-form'

const store = useNotificationsStore()
const router = useRouter()
const Vjsf = defineAsyncComponent(() => import('@koumoul/vjsf'))
const form = reactive({ user_id: '', type: '' as NotificationType, message: '' })
const formSchema = ref<ApiFormSchema | null>(null)
const loadingForm = ref(true)
const error = ref('')
onMounted(async () => {
  try {
    const { vjsf } = await store.createForm()
    formSchema.value = vjsf.schema
    Object.assign(form, vjsf.model)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load the notification form.')
  } finally {
    loadingForm.value = false
  }
})

async function submit() {
  try {
    const message = JSON.parse(form.message)
    if (!message || typeof message !== 'object' || Array.isArray(message)) throw new Error('Message must be a JSON object.')
    await store.create({ user_id: form.user_id.trim(), type: form.type, message })
    await router.push('/notifications/create')
  } catch (cause) {
    error.value = cause instanceof SyntaxError ? 'Message must contain valid JSON.' : getApiErrorMessage(cause, 'Unable to create notification.')
  }
}
</script>

<template>
  <VContainer>
    <VBtn class="mb-6" to="/" variant="text">Back to dashboard</VBtn>
    <h1 class="text-h4 font-weight-bold">Create notification</h1>
    <VAlert v-if="error" class="mt-4" color="error">{{ error }}</VAlert>
    <VForm class="mt-6" @submit.prevent="submit">
      <Vjsf v-if="formSchema" v-model="form" :schema="formSchema" />
      <VBtn class="mt-4" color="primary" :disabled="loadingForm || !formSchema" :loading="loadingForm || store.loading" type="submit">Create notification</VBtn>
    </VForm>
  </VContainer>
</template>
