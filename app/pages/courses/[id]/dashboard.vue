<script setup lang="ts">
const route = useRoute()
const courses = useCoursesStore()
const course = ref<Awaited<ReturnType<typeof courses.show>> | null>(null)
const error = ref('')

async function markReady() {
  if (!course.value) return
  try {
    course.value = await courses.changeStatus(course.value.id, 'ready')
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to mark course as ready.')
  }
}

onMounted(async () => {
  try {
    course.value = await courses.show(String(route.params.id))
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load course.')
  }
})
</script>

<template>
  <VCard rounded="xl" variant="flat">
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 px-6 py-4">
      <div class="d-flex align-center ga-3">
        <VBtn aria-label="Back to courses" icon="mdi-arrow-left" to="/courses" variant="text" />
        <h1 class="text-h5 font-weight-bold">{{ course?.title || 'Course dashboard' }}<span v-if="course"> ({{ course.status || 'new' }})</span></h1>
      </div>
      <div class="d-flex flex-wrap align-center ga-2">
        <VBtn v-if="course?.permissions?.read" prepend-icon="mdi-eye-outline" :to="`/courses/${course.id}/view`" variant="text">View course</VBtn>
        <VBtn v-if="course?.permissions?.change_status" prepend-icon="mdi-check" :disabled="course.status !== 'draft'" variant="text" @click="markReady">Mark as ready</VBtn>
        <VBtn v-if="course?.permissions?.update" :to="`/courses/${course.id}/edit`" variant="text">Edit course</VBtn>
      </div>
    </div>

    <VAlert v-if="error" class="mx-6 mb-4" color="error" variant="tonal">{{ error }}</VAlert>

    <VTabs color="primary">
      <VTab value="users">Users</VTab>
      <VTab value="groups">Groups</VTab>
      <VTab value="files">Files</VTab>
    </VTabs>

    <VCardText class="pa-6">
      <div class="text-body-2 text-medium-emphasis">Course users, groups, and files will appear here.</div>
    </VCardText>
  </VCard>
</template>
