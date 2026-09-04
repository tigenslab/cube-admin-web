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

async function submit() {
  loading.value = true
  error.value = null

  try {
    const api = useApi()
    await api('/sessions/forgot-token', {
      method: 'POST',
      body: { username: username.value }
    })
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
    const api = useApi()
    await api('/sessions/reset-password', {
      method: 'POST',
      body: {
        username: username.value,
        confirmation_code: confirmationCode.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value
      }
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
    <VBtn class="mb-6" prepend-icon="mdi-arrow-left" size="small" to="/sessions/login" variant="text">Back to sign in</VBtn>
    <div class="text-overline text-primary font-weight-bold">ACCOUNT RECOVERY</div>
    <h2 class="text-h4 font-weight-bold mt-2">Forgot password?</h2>
    <p class="text-body-2 text-medium-emphasis mt-3">Enter your username and we’ll help you reset your password.</p>

    <VAlert v-if="error" class="mt-6" color="error" density="compact" icon="mdi-alert-circle-outline" variant="tonal">
      {{ error }}
    </VAlert>
    <VAlert v-else-if="completed" class="mt-6" color="success" density="compact" icon="mdi-check-circle-outline" variant="tonal">
      Your password has been reset. You can now sign in.
    </VAlert>

    <VForm v-if="!codeSent" class="mt-8" @submit.prevent="submit">
      <label class="text-body-2 font-weight-medium" for="username">Username</label>
      <VTextField id="username" v-model="username" class="mt-2" density="comfortable" placeholder="Enter your username" prepend-inner-icon="mdi-account-outline" required rounded="lg" type="text" variant="outlined" />
      <VBtn :loading="loading" block class="mt-4" color="primary" size="large" type="submit">Send reset instructions</VBtn>
    </VForm>

    <VForm v-else-if="!completed" class="mt-8" @submit.prevent="resetPassword">
      <label class="text-body-2 font-weight-medium" for="confirmation-code">Confirmation code</label>
      <VTextField id="confirmation-code" v-model="confirmationCode" class="mt-2" density="comfortable" hint="Enter the six-digit code sent by Cognito." persistent-hint placeholder="Enter confirmation code" prepend-inner-icon="mdi-numeric" required rounded="lg" type="text" variant="outlined" />

      <label class="text-body-2 font-weight-medium d-block mt-5" for="new-password">New password</label>
      <VTextField id="new-password" v-model="password" class="mt-2" density="comfortable" hint="Use at least 8 characters." persistent-hint prepend-inner-icon="mdi-lock-outline" required rounded="lg" type="password" variant="outlined" />

      <label class="text-body-2 font-weight-medium d-block mt-5" for="confirm-password">Confirm new password</label>
      <VTextField id="confirm-password" v-model="passwordConfirmation" class="mt-2" prepend-inner-icon="mdi-lock-check-outline" required rounded="lg" type="password" variant="outlined" />

      <VBtn :loading="loading" block class="mt-4" color="primary" size="large" type="submit">Reset password</VBtn>
    </VForm>
  </div>
</template>
