<script setup lang="ts">
import type { ApiFormSchema } from '~/types/api-form'

const route = useRoute()
const router = useRouter()
const store = useEnrolmentsApi()
const form = reactive({ trainer_ids: [] as string[] })
const schema = ref<ApiFormSchema | null>(null)
const loadingForm = ref(true)
const error = ref('')
const id = String(route.params.id)

onMounted(async () => {
  try {
    const { vjsf } = await store.editForm(id)
    schema.value = vjsf.schema
    form.trainer_ids = vjsf.model.trainer_ids || []
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load trainer assignments.')
  } finally {
    loadingForm.value = false
  }
})

async function submit() {
  error.value = ''
  try {
    await store.updateTrainers(id, form.trainer_ids)
    await router.push('/enrolments')
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to update trainers.')
  }
}
</script>

<template>
  <VContainer>
    <VBtn class="mb-6" to="/enrolments" variant="text">Back to enrolments</VBtn>
    <h1 class="text-h4 font-weight-bold">Assign trainers</h1>
    <VAlert v-if="error" class="mt-4" color="error" variant="tonal">{{ error }}</VAlert>
    <VForm class="mt-6" @submit.prevent="submit">
      <FormsVjsfForm v-if="schema" v-model="form" :schema="schema" />
      <VBtn class="mt-4" color="primary" :disabled="loadingForm || !schema" :loading="loadingForm || store.actionLoading[`update_${id}`]" type="submit">Save trainers</VBtn>
    </VForm>
  </VContainer>
</template>
