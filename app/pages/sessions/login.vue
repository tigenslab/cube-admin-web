<script setup lang="ts">
import { storeToRefs } from 'pinia'

definePageMeta({ layout: 'auth' })

const session = useSessionStore()
const { error, lastAction } = storeToRefs(session)
const password = ref('')

async function login() {
  try {
    await session.login({
      username: session.username,
      password: password.value
    })
    await navigateTo(session.pendingChallenge ? '/sessions/new-password' : '/')
  } catch {
    // The store exposes the request failure through session.error.
  }
}
</script>

<template>
  <div>
    <div class="text-overline text-primary font-weight-bold">WELCOME BACK</div>
    <h2 class="text-h4 font-weight-bold mt-2">Sign in to your account</h2>
    <p class="text-body-2 text-medium-emphasis mt-3">Enter your details to continue to your workspace.</p>

    <VAlert v-if="error" class="mt-6" color="error" density="compact" icon="mdi-alert-circle-outline" variant="tonal">
      {{ error }}
    </VAlert>
    <VAlert v-else-if="lastAction === 'login'" class="mt-6" color="success" density="compact" icon="mdi-check-circle-outline" variant="tonal">
      Signed in successfully.
    </VAlert>

    <VForm class="mt-8" @submit.prevent="login">
      <label class="text-body-2 font-weight-medium" for="username">Username</label>
      <VTextField id="username" v-model="session.username" autocomplete="username" class="mt-2" density="comfortable" placeholder="Enter your username" prepend-inner-icon="mdi-account-outline" required rounded="lg" type="text" variant="outlined" />

      <div class="d-flex align-center justify-space-between mt-2">
        <label class="text-body-2 font-weight-medium" for="password">Password</label>
        <NuxtLink class="text-primary text-body-2 font-weight-medium" to="/sessions/forgot-password">Forgot password?</NuxtLink>
      </div>
      <VTextField id="password" v-model="password" class="mt-2" density="comfortable" placeholder="Enter your password" prepend-inner-icon="mdi-lock-outline" required rounded="lg" type="password" variant="outlined" />

      <VBtn :loading="session.loading" block class="mt-4" color="primary" size="large" type="submit">Sign in</VBtn>
    </VForm>

    <div class="text-center text-body-2 text-medium-emphasis mt-8">Need an account? <NuxtLink class="text-primary font-weight-medium" to="/sessions/set_password">Contact an administrator</NuxtLink></div>
  </div>
</template>
