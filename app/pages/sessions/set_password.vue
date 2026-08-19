<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const password = ref('')
const confirmation = ref('')
const submitted = ref(false)

function setPassword() {
  submitted.value = true
}
</script>

<template>
  <div>
    <VBtn class="mb-6" prepend-icon="mdi-arrow-left" size="small" to="/sessions/login" variant="text">Back to sign in</VBtn>
    <div class="text-overline text-primary font-weight-bold">ACCOUNT SETUP</div>
    <h2 class="text-h4 font-weight-bold mt-2">Set your password</h2>
    <p class="text-body-2 text-medium-emphasis mt-3">Create a strong password to protect your account.</p>

    <VAlert v-if="submitted" class="mt-6" color="success" density="compact" icon="mdi-check-circle-outline" variant="tonal">
      Your password has been set. You can now sign in.
    </VAlert>

    <VForm class="mt-8" @submit.prevent="setPassword">
      <label class="text-body-2 font-weight-medium" for="new-password">New password</label>
      <VTextField id="new-password" v-model="password" class="mt-2" density="comfortable" hint="Use at least 8 characters." persistent-hint prepend-inner-icon="mdi-lock-outline" required rounded="lg" type="password" variant="outlined" />
      <label class="text-body-2 font-weight-medium d-block mt-5" for="confirm-password">Confirm password</label>
      <VTextField id="confirm-password" v-model="confirmation" class="mt-2" density="comfortable" placeholder="Repeat your password" prepend-inner-icon="mdi-lock-check-outline" required rounded="lg" type="password" variant="outlined" />
      <VBtn block class="mt-4" color="primary" size="large" type="submit">Set password</VBtn>
    </VForm>
  </div>
</template>
