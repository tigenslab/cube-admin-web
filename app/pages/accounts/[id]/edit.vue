<script setup lang="ts">
const route = useRoute()
const store = useAccountsStore()
const accountId = computed(() => String(route.params.id))
const editDialog = ref(true)

async function loadAccountEditForm() {
  return store.editForm(accountId.value)
}

async function saveAccountEditForm(model: Record<string, any>) {
  return store.update(accountId.value, model)
}

async function returnToAccounts() {
  await navigateTo('/accounts')
}
</script>

<template>
  <VContainer>
    <VBtn class="mb-6" to="/accounts" variant="text">Back to accounts</VBtn>
    <h1 class="text-h4 font-weight-bold">Edit account</h1>
    <FormsVjsfFormDialog
      v-model="editDialog"
      :load-form="loadAccountEditForm"
      :load-key="accountId"
      :save-form="saveAccountEditForm"
      title="Edit account"
      @saved="returnToAccounts"
    />
  </VContainer>
</template>
