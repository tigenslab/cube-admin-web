<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const session = useSessionStore()
const currentPassword = ref('')
const password = ref('')
const confirmation = ref('')
const error = ref<string | null>(null)

async function changePassword() {
  error.value = null
  if (password.value !== confirmation.value) {
    error.value = 'New passwords do not match.'
    return
  }

  try {
    await session.changePassword(currentPassword.value, password.value, confirmation.value)
    currentPassword.value = ''
    password.value = ''
    confirmation.value = ''
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to change your password. Please try again.')
  }
}
</script>

<template>
  <div>
    <VBtn class="mb-6" prepend-icon="mdi-arrow-left" size="small" to="/" variant="text">Back to dashboard</VBtn>
    <SessionsPageHeading description="Use a unique password that you do not use elsewhere." eyebrow="SECURITY" title="Change password" />

    <VAlert v-if="error" class="mt-6" color="error" density="compact" icon="mdi-alert-circle-outline" variant="tonal">{{ error }}</VAlert>
    <VAlert v-if="session.lastAction === 'change-password'" class="mt-6" color="success" density="compact" icon="mdi-check-circle-outline" variant="tonal">
      Your password has been updated.
    </VAlert>

    <VForm class="mt-8" @submit.prevent="changePassword">
      <SessionsFormField id="current-password" v-model="currentPassword" density="comfortable" label="Current password" placeholder="Enter your current password" prepend-icon="mdi-lock-outline" type="password" />
      <SessionsFormField id="changed-password" v-model="password" container-class="mt-5" density="comfortable" hint="Use at least 8 characters." label="New password" persistent-hint prepend-icon="mdi-lock-outline" type="password" />
      <SessionsFormField id="changed-confirmation" v-model="confirmation" container-class="mt-5" density="comfortable" label="Confirm new password" placeholder="Repeat your new password" prepend-icon="mdi-lock-check-outline" type="password" />
      <VBtn :loading="session.loading" block class="mt-4" color="primary" size="large" type="submit">Update password</VBtn>
    </VForm>
  </div>
</template>
