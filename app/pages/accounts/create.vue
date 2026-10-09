<script setup lang="ts">
const store = useAccountsStore()
const form = reactive({ name: '', subdomain: '', address_json: {}, disabled: 0 })
const error = ref('')
async function submit() { try { await store.create(form); await navigateTo('/accounts') } catch (cause) { error.value = getApiErrorMessage(cause, 'Unable to create account.') } }
</script>
<template><VContainer><VBtn class="mb-6" to="/accounts" variant="text">Back to accounts</VBtn><h1 class="text-h4 font-weight-bold">Create account</h1><VAlert v-if="error" class="mt-4" color="error">{{ error }}</VAlert><VForm class="mt-6" @submit.prevent="submit"><VTextField v-model="form.name" label="Name" required /><VTextField v-model="form.subdomain" label="Subdomain" hint="Lowercase letters, numbers, and hyphens" persistent-hint required /><VSwitch v-model="form.disabled" :false-value="0" :true-value="1" label="Disabled" /><VBtn class="mt-4" color="primary" type="submit">Create account</VBtn></VForm></VContainer></template>
