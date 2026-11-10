<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const username = ref('')
const confirmationCode = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const codeSent = ref(false)
const completed = ref(false)
const session = useSessionStore()

async function submit() {
  loading.value = true
  error.value = null

  try {
    await session.requestPasswordReset(username.value)
    codeSent.value = true
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to process your request. Please try again.')
  } finally {
    loading.value = false
  }
}

async function resetPassword() {
  if (password.value !== passwordConfirmation.value) {
    error.value = 'Passwords do not match.'
    return
  }

  loading.value = true
  error.value = null
  try {
    await session.resetPassword({
      username: username.value,
      confirmation_code: confirmationCode.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value
    })
    completed.value = true
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to reset your password. Please try again.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <ButtonsBase class="mb-6" prepend-icon="mdi-arrow-left" size="small" to="/sessions/login" variant="text">Back to sign in</ButtonsBase>
    <SessionsPageHeading description="Enter your username and we’ll help you reset your password." eyebrow="ACCOUNT RECOVERY" title="Forgot password?" />

    <VAlert v-if="error" class="mt-6" color="error" density="compact" icon="mdi-alert-circle-outline" variant="tonal">
      {{ error }}
    </VAlert>
    <VAlert v-else-if="completed" class="mt-6" color="success" density="compact" icon="mdi-check-circle-outline" variant="tonal">
      Your password has been reset. You can now sign in.
    </VAlert>

    <VForm v-if="!codeSent" class="mt-8" @submit.prevent="submit">
      <SessionsFormField id="username" v-model="username" density="comfortable" label="Username" placeholder="Enter your username" prepend-icon="mdi-account-outline" />
      <ButtonsBase :loading="loading" block class="mt-4" color="primary" size="large" type="submit">Send reset instructions</ButtonsBase>
    </VForm>

    <VForm v-else-if="!completed" class="mt-8" @submit.prevent="resetPassword">
      <SessionsFormField id="confirmation-code" v-model="confirmationCode" density="comfortable" hint="Enter the six-digit code sent by Cognito." label="Confirmation code" persistent-hint placeholder="Enter confirmation code" prepend-icon="mdi-numeric" />
      <SessionsFormField id="new-password" v-model="password" container-class="mt-5" density="comfortable" hint="Use at least 8 characters." label="New password" persistent-hint prepend-icon="mdi-lock-outline" type="password" />
      <SessionsFormField id="confirm-password" v-model="passwordConfirmation" container-class="mt-5" label="Confirm new password" prepend-icon="mdi-lock-check-outline" type="password" />

      <ButtonsBase :loading="loading" block class="mt-4" color="primary" size="large" type="submit">Reset password</ButtonsBase>
    </VForm>
  </div>
</template>
