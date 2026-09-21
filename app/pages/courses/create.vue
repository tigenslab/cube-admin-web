<script setup lang="ts">
const coursesStore = useCoursesStore()
const router = useRouter()
const title = ref('')
const code = ref('')
const subType = ref('')
const type = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)

async function submit() {
  if (!title.value.trim() || !code.value.trim() || !subType.value.trim() || !type.value.trim()) return

  submitting.value = true
  error.value = null
  try {
    await coursesStore.create({ title: title.value.trim(), code: code.value.trim(), sub_type: subType.value.trim(), type: type.value.trim() })
    await router.push('/courses')
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to create course.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="page-header mb-8">
    <div>
      <div class="text-overline text-primary font-weight-bold">LEARNING</div>
      <h1 class="text-h4 font-weight-bold mt-1">Create course</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">Add a new course to your catalogue.</p>
    </div>
  </section>

  <VCard max-width="720" rounded="xl" variant="flat">
    <VCardItem class="pa-6 pb-2">
      <template #title>Course details</template>
    </VCardItem>
    <VCardText class="pa-6">
      <VAlert v-if="error" class="mb-5" color="error" density="compact" variant="tonal">{{ error }}</VAlert>
      <VForm @submit.prevent="submit">
        <VTextField v-model="title" class="mb-4" label="Title" placeholder="Mathematicsd" required />
        <VTextField v-model="code" class="mb-4" label="Code" placeholder="Mathematics Year 7" required />
        <VTextField v-model="subType" class="mb-4" label="Sub-type" required />
        <VTextField v-model="type" class="mb-4" label="Type" placeholder="course" required />
        <div class="d-flex justify-end ga-3">
          <VBtn to="/courses" variant="text">Cancel</VBtn>
          <VBtn color="primary" :loading="submitting" type="submit">Create course</VBtn>
        </div>
      </VForm>
    </VCardText>
  </VCard>
</template>
