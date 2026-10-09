<script setup lang="ts">
const route = useRoute(); const store = useAccountsStore(); const form = reactive({ name: '', subdomain: '', address_json: {}, disabled: 0 }); const error = ref('')
onMounted(async () => { try { Object.assign(form, await store.show(String(route.params.id))) } catch (cause) { error.value = getApiErrorMessage(cause, 'Unable to load account.') } })
async function submit() { try { await store.update(String(route.params.id), form); await navigateTo('/accounts') } catch (cause) { error.value = getApiErrorMessage(cause, 'Unable to update account.') } }
</script>
<template><VContainer><VBtn class="mb-6" to="/accounts" variant="text">Back to accounts</VBtn><h1 class="text-h4 font-weight-bold">Edit account</h1><VAlert v-if="error" class="mt-4" color="error">{{ error }}</VAlert><VForm class="mt-6" @submit.prevent="submit"><VTextField v-model="form.name" label="Name" required /><VTextField v-model="form.subdomain" label="Subdomain" required /><VSwitch v-model="form.disabled" :false-value="0" :true-value="1" label="Disabled" /><VBtn class="mt-4" color="primary" type="submit">Save changes</VBtn></VForm></VContainer></template>
