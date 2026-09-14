<script setup lang="ts">
const route = useRoute()
const store = useUsersStore()
const form = reactive({ email: '', first_name: '', last_name: '', phone: '', roles: [] as string[] })
const error = ref('')
const roles = ['admin', 'trainer', 'learner', 'master']
onMounted(async () => {
  try {
    const user = await store.show(String(route.params.id))
    Object.assign(form, user)
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Unable to load user.')
  }
})
async function submit() {
  try {
    await store.update(String(route.params.id), form)
    await navigateTo('/users')
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Unable to update user.')
  }
}
</script>
<template>
  <VContainer
    ><VBtn class="mb-6" to="/users" variant="text">Back to users</VBtn>
    <h1 class="text-h4 font-weight-bold">Edit user</h1>
    <VAlert v-if="error" class="mt-4" color="error">{{ error }}</VAlert
    ><VForm class="mt-6" @submit.prevent="submit"
      ><VTextField v-model="form.email" label="Email" type="email" required /><VTextField v-model="form.first_name" label="First name" /><VTextField
        v-model="form.last_name"
        label="Last name"
      /><VTextField v-model="form.phone" label="Phone" /><VSelect v-model="form.roles" :items="roles" label="Roles" multiple /><VBtn class="mt-4" color="primary" type="submit"
        >Save changes</VBtn
      ></VForm
    ></VContainer
  >
</template>
