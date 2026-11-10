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
    <SessionsPageHeading description="Enter your details to continue to your workspace." eyebrow="WELCOME BACK" title="Sign in to your account" />

    <VAlert v-if="error" class="mt-6" color="error" density="compact" icon="mdi-alert-circle-outline" variant="tonal">
      {{ error }}
    </VAlert>
    <VAlert v-else-if="lastAction === 'login'" class="mt-6" color="success" density="compact" icon="mdi-check-circle-outline" variant="tonal">
      Signed in successfully.
    </VAlert>

    <VForm class="mt-8" @submit.prevent="login">
      <SessionsFormField id="username" v-model="session.username" autocomplete="username" density="comfortable" label="Username" placeholder="Enter your username" prepend-icon="mdi-account-outline" />
      <SessionsFormField id="password" v-model="password" container-class="mt-2" density="comfortable" label="Password" placeholder="Enter your password" prepend-icon="mdi-lock-outline" type="password">
        <template #label-action>
          <NuxtLink class="text-primary text-body-2 font-weight-medium" to="/sessions/forgot-password">Forgot password?</NuxtLink>
        </template>
      </SessionsFormField>

      <VBtn :loading="session.loading" block class="mt-4" color="primary" size="large" type="submit">Sign in</VBtn>
    </VForm>

    <div class="text-center text-body-2 text-medium-emphasis mt-8">Need an account? <NuxtLink class="text-primary font-weight-medium" to="/sessions/set_password">Contact an administrator</NuxtLink></div>
  </div>
</template>
