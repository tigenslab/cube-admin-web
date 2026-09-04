<script setup lang="ts">
import { storeToRefs } from 'pinia'

definePageMeta({ layout: 'auth' })

const session = useSessionStore()
const { error } = storeToRefs(session)
const password = ref('')
const confirmation = ref('')

onMounted(() => {
  if (!session.pendingChallenge) navigateTo('/sessions/login')
})

async function submit() {
  if (password.value !== confirmation.value) {
    session.error = 'Passwords do not match.'
    return
  }

  try {
    await session.completeNewPassword(password.value)
    await navigateTo('/')
  } catch {
    // The store exposes the request failure through session.error.
  }
}
</script>

<template>
  <div>
    <div class="text-overline text-primary font-weight-bold">FIRST SIGN IN</div>
    <h2 class="text-h4 font-weight-bold mt-2">Set your password</h2>
    <p class="text-body-2 text-medium-emphasis mt-3">Choose a new password to continue to your workspace.</p>

    <VAlert v-if="error" class="mt-6" color="error" density="compact" icon="mdi-alert-circle-outline" variant="tonal">
      {{ error }}
    </VAlert>

    <VForm class="mt-8" @submit.prevent="submit">
      <label class="text-body-2 font-weight-medium" for="new-password">New password</label>
      <VTextField id="new-password" v-model="password" class="mt-2" hint="Use at least 8 characters." persistent-hint prepend-inner-icon="mdi-lock-outline" required rounded="lg" type="password" variant="outlined" />

      <label class="text-body-2 font-weight-medium d-block mt-5" for="confirm-password">Confirm password</label>
      <VTextField id="confirm-password" v-model="confirmation" class="mt-2" prepend-inner-icon="mdi-lock-check-outline" required rounded="lg" type="password" variant="outlined" />


      <VBtn :loading="session.loading" block class="mt-4" color="primary" size="large" type="submit">Set password</VBtn>
    </VForm>
  </div>
</template>
