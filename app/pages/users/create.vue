<script setup lang="ts">
import type { ApiFormSchema } from '~/types/api-form'

const store = useUsersApi(); const form = reactive({ username: '', email: '', first_name: '', last_name: '', phone: '', roles: [] as string[], password: '' })
const error = ref(''); const loadingForm = ref(true)
const formSchema = ref<ApiFormSchema | null>(null)
onMounted(async () => {
  try {
    const { vjsf } = await store.newForm()
    formSchema.value = vjsf.schema
    Object.assign(form, vjsf.model)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load the user form.')
  } finally {
    loadingForm.value = false
  }
})
async function submit() { try { await store.create(form); await navigateTo('/users') } catch (e) { error.value = getApiErrorMessage(e, 'Unable to create user.') } }
</script>
<template>
  <VContainer>
    <ButtonsBase class="mb-6" to="/users" variant="text">Back to users</ButtonsBase>
    <h1 class="text-h4 font-weight-bold">Create user</h1>
    <VAlert v-if="error" class="mt-4" color="error">{{ error }}</VAlert>
    <VForm class="mt-6" @submit.prevent="submit">
      <FormsVjsfForm v-if="formSchema" v-model="form" :schema="formSchema" />
      <ButtonsBase class="mt-4" color="primary" :disabled="loadingForm || !formSchema" :loading="loadingForm || store.loading" type="submit">Create user</ButtonsBase>
    </VForm>
  </VContainer>
</template>
