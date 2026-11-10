<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const session = useSessionStore()
const password = ref('')
const confirmation = ref('')

function setPassword() {
  session.setPassword()
}
</script>

<template>
  <div>
    <ButtonsBase class="mb-6" prepend-icon="mdi-arrow-left" size="small" to="/sessions/login" variant="text">Back to sign in</ButtonsBase>
    <SessionsPageHeading description="Create a strong password to protect your account." eyebrow="ACCOUNT SETUP" title="Set your password" />

    <VAlert v-if="session.lastAction === 'set-password'" class="mt-6" color="success" density="compact" icon="mdi-check-circle-outline" variant="tonal">
      Your password has been set. You can now sign in.
    </VAlert>

    <VForm class="mt-8" @submit.prevent="setPassword">
      <SessionsFormField id="new-password" v-model="password" density="comfortable" hint="Use at least 8 characters." label="New password" persistent-hint prepend-icon="mdi-lock-outline" type="password" />
      <SessionsFormField id="confirm-password" v-model="confirmation" container-class="mt-5" density="comfortable" label="Confirm password" placeholder="Repeat your password" prepend-icon="mdi-lock-check-outline" type="password" />
      <ButtonsBase block class="mt-4" color="primary" size="large" type="submit">Set password</ButtonsBase>
    </VForm>
  </div>
</template>
