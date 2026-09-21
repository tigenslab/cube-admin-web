<script setup lang="ts">
const store = useNotificationsStore()
const router = useRouter()
const form = reactive({ user_id: '', type: 'notification' as NotificationType, message: '{\n  "title": "",\n  "body": ""\n}' })
const error = ref('')

async function submit() {
  try {
    const message = JSON.parse(form.message)
    if (!message || typeof message !== 'object' || Array.isArray(message)) throw new Error('Message must be a JSON object.')
    await store.create({ user_id: form.user_id.trim(), type: form.type, message })
    await router.push('/notifications/create')
  } catch (cause) {
    error.value = cause instanceof SyntaxError ? 'Message must contain valid JSON.' : getApiErrorMessage(cause, 'Unable to create notification.')
  }
}
</script>

<template>
  <VContainer>
    <VBtn class="mb-6" to="/" variant="text">Back to dashboard</VBtn>
    <h1 class="text-h4 font-weight-bold">Create notification</h1>
    <VAlert v-if="error" class="mt-4" color="error">{{ error }}</VAlert>
    <VForm class="mt-6" @submit.prevent="submit">
      <VTextField v-model="form.user_id" label="User ID" required />
      <VSelect v-model="form.type" :items="['email', 'sms', 'notification']" label="Type" required />
      <VTextarea v-model="form.message" class="mt-2" label="Message JSON" required rows="10" />
      <VBtn class="mt-4" color="primary" :loading="store.loading" type="submit">Create notification</VBtn>
    </VForm>
  </VContainer>
</template>
