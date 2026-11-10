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
    <SessionsPageHeading description="Choose a new password to continue to your workspace." eyebrow="FIRST SIGN IN" title="Set your password" />

    <VAlert v-if="error" class="mt-6" color="error" density="compact" icon="mdi-alert-circle-outline" variant="tonal">
      {{ error }}
    </VAlert>

    <VForm class="mt-8" @submit.prevent="submit">
      <SessionsFormField id="new-password" v-model="password" hint="Use at least 8 characters." label="New password" persistent-hint prepend-icon="mdi-lock-outline" type="password" />
      <SessionsFormField id="confirm-password" v-model="confirmation" container-class="mt-5" label="Confirm password" prepend-icon="mdi-lock-check-outline" type="password" />

      <VBtn :loading="session.loading" block class="mt-4" color="primary" size="large" type="submit">Set password</VBtn>
    </VForm>
  </div>
</template>
