<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const session = useSessionStore()
const currentPassword = ref('')
const password = ref('')
const confirmation = ref('')

function changePassword() {
  session.changePassword()
}
</script>

<template>
  <div>
    <VBtn class="mb-6" prepend-icon="mdi-arrow-left" size="small" to="/" variant="text">Back to dashboard</VBtn>
    <div class="text-overline text-primary font-weight-bold">SECURITY</div>
    <h2 class="text-h4 font-weight-bold mt-2">Change password</h2>
    <p class="text-body-2 text-medium-emphasis mt-3">Use a unique password that you do not use elsewhere.</p>

    <VAlert v-if="session.lastAction === 'change-password'" class="mt-6" color="success" density="compact" icon="mdi-check-circle-outline" variant="tonal">
      Your password has been updated.
    </VAlert>

    <VForm class="mt-8" @submit.prevent="changePassword">
      <label class="text-body-2 font-weight-medium" for="current-password">Current password</label>
      <VTextField id="current-password" v-model="currentPassword" class="mt-2" density="comfortable" placeholder="Enter your current password" prepend-inner-icon="mdi-lock-outline" required rounded="lg" type="password" variant="outlined" />
      <label class="text-body-2 font-weight-medium d-block mt-5" for="changed-password">New password</label>
      <VTextField id="changed-password" v-model="password" class="mt-2" density="comfortable" hint="Use at least 8 characters." persistent-hint prepend-inner-icon="mdi-lock-outline" required rounded="lg" type="password" variant="outlined" />
      <label class="text-body-2 font-weight-medium d-block mt-5" for="changed-confirmation">Confirm new password</label>
      <VTextField id="changed-confirmation" v-model="confirmation" class="mt-2" density="comfortable" placeholder="Repeat your new password" prepend-inner-icon="mdi-lock-check-outline" required rounded="lg" type="password" variant="outlined" />
      <VBtn block class="mt-4" color="primary" size="large" type="submit">Update password</VBtn>
    </VForm>
  </div>
</template>
