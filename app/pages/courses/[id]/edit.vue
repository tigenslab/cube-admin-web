<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const coursesStore = useCoursesStore()
const course = computed(() => coursesStore.courses.find(item => item.id === route.params.id))
const title = ref('')
const code = ref('')
const level = ref<number | null>(null)
const type = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  if (!course.value) await coursesStore.search()
  if (course.value) {
    title.value = course.value.title
    code.value = course.value.code
    level.value = course.value.level
    type.value = course.value.type
  }
})

async function submit() {
  if (!course.value || !title.value.trim() || !code.value.trim() || level.value === null || !type.value.trim()) return
  submitting.value = true
  error.value = null
  try {
    await coursesStore.update(course.value.id, { title: title.value.trim(), code: code.value.trim(), level: level.value, type: type.value.trim() })
    await router.push('/courses')
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to update course.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="page-header mb-8"><div><div class="text-overline text-primary font-weight-bold">LEARNING</div><h1 class="text-h4 font-weight-bold mt-1">Edit course</h1></div></section>
  <VCard max-width="720" rounded="xl" variant="flat"><VCardText class="pa-6"><VAlert v-if="error" class="mb-5" color="error" density="compact" variant="tonal">{{ error }}</VAlert><VForm @submit.prevent="submit"><VTextField v-model="title" class="mb-4" label="Title" required /><VTextField v-model="code" class="mb-4" label="Code" required /><VTextField v-model.number="level" class="mb-4" label="Level" required type="number" /><VTextField v-model="type" class="mb-4" label="Type" required /><div class="d-flex justify-end ga-3"><VBtn to="/courses" variant="text">Cancel</VBtn><VBtn color="primary" :loading="submitting" type="submit">Save changes</VBtn></div></VForm></VCardText></VCard>
</template>
