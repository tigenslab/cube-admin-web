<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const email = ref('')
const password = ref('')
const submitted = ref(false)

function login() {
  submitted.value = true
}
</script>

<template>
  <div>
    <div class="text-overline text-primary font-weight-bold">WELCOME BACK</div>
    <h2 class="text-h4 font-weight-bold mt-2">Sign in to your account</h2>
    <p class="text-body-2 text-medium-emphasis mt-3">Enter your details to continue to your workspace.</p>

    <VAlert v-if="submitted" class="mt-6" color="success" density="compact" icon="mdi-check-circle-outline" variant="tonal">
      Demo login submitted successfully.
    </VAlert>

    <VForm class="mt-8" @submit.prevent="login">
      <label class="text-body-2 font-weight-medium" for="email">Email address</label>
      <VTextField id="email" v-model="email" class="mt-2" density="comfortable" placeholder="you@example.com" prepend-inner-icon="mdi-email-outline" required rounded="lg" type="email" variant="outlined" />

      <div class="d-flex align-center justify-space-between mt-2">
        <label class="text-body-2 font-weight-medium" for="password">Password</label>
        <NuxtLink class="text-primary text-body-2 font-weight-medium" to="/sessions/set_password">Forgot password?</NuxtLink>
      </div>
      <VTextField id="password" v-model="password" class="mt-2" density="comfortable" placeholder="Enter your password" prepend-inner-icon="mdi-lock-outline" required rounded="lg" type="password" variant="outlined" />

      <VBtn block class="mt-4" color="primary" size="large" type="submit">Sign in</VBtn>
    </VForm>

    <div class="text-center text-body-2 text-medium-emphasis mt-8">Need an account? <NuxtLink class="text-primary font-weight-medium" to="/sessions/set_password">Contact an administrator</NuxtLink></div>
  </div>
</template>
