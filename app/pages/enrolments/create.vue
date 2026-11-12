<script setup lang="ts">
import type { ApiFormSchema } from '~/types/api-form'

const store = useEnrolmentsApi()
const router = useRouter()
const form = reactive({ course_id: '', learner_id: '', trainer_ids: [] as string[] })
const schema = ref<ApiFormSchema | null>(null)
const loadingForm = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const { vjsf } = await store.newForm()
    schema.value = vjsf.schema
    Object.assign(form, vjsf.model)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load the enrolment form.')
  } finally {
    loadingForm.value = false
  }
})

async function submit() {
  error.value = ''
  try {
    await store.create(form)
    await router.push('/enrolments')
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to enrol the learner.')
  }
}
</script>

<template>
  <VContainer>
    <VBtn class="mb-6" to="/enrolments" variant="text">Back to enrolments</VBtn>
    <h1 class="text-h4 font-weight-bold">Enrol learner</h1>
    <VAlert v-if="error" class="mt-4" color="error" variant="tonal">{{ error }}</VAlert>
    <VForm class="mt-6" @submit.prevent="submit">
      <FormsVjsfForm v-if="schema" v-model="form" :schema="schema" />
      <VBtn class="mt-4" color="primary" :disabled="loadingForm || !schema" :loading="loadingForm || store.actionLoading.create" type="submit">Create enrolment</VBtn>
    </VForm>
  </VContainer>
</template>
