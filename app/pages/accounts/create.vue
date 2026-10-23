<script setup lang="ts">
import type { ApiFormSchema } from '~/types/api-form'

const store = useAccountsStore()
const Vjsf = defineAsyncComponent(() => import('@koumoul/vjsf'))
const form = reactive({ name: '', subdomain: '', address_json: {}, disabled: 0 })
const formSchema = ref<ApiFormSchema | null>(null)
const loadingForm = ref(true)
const error = ref('')
onMounted(async () => {
  try {
    const { vjsf } = await store.newForm()
    formSchema.value = vjsf.schema
    Object.assign(form, vjsf.model)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load the account form.')
  } finally {
    loadingForm.value = false
  }
})
async function submit() { try { await store.create(form); await navigateTo('/accounts') } catch (cause) { error.value = getApiErrorMessage(cause, 'Unable to create account.') } }
</script>
<template><VContainer><VBtn class="mb-6" to="/accounts" variant="text">Back to accounts</VBtn><h1 class="text-h4 font-weight-bold">Create account</h1><VAlert v-if="error" class="mt-4" color="error">{{ error }}</VAlert><VForm class="mt-6" @submit.prevent="submit"><Vjsf v-if="formSchema" v-model="form" :schema="formSchema" /><VBtn class="mt-4" color="primary" :disabled="loadingForm || !formSchema" :loading="loadingForm || store.loading" type="submit">Create account</VBtn></VForm></VContainer></template>
