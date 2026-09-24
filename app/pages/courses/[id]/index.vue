<script setup lang="ts">
const route = useRoute()
const courses = useCoursesStore()
const course = ref<Awaited<ReturnType<typeof courses.show>> | null>(null)
const error = ref('')
const nextStatus: Record<string, string> = { new: 'draft', draft: 'ready', ready: 'publish', publish: 'draft' }

async function changeStatus() {
  if (!course.value) return
  const next = nextStatus[course.value.status || 'new']
  if (!next) return
  try { course.value = await courses.changeStatus(course.value.id, next) }
  catch (cause) { error.value = getApiErrorMessage(cause, 'Unable to change course status.') }
}
onMounted(async () => {
  try { course.value = await courses.show(String(route.params.id)) }
  catch (cause) { error.value = getApiErrorMessage(cause, 'Unable to load course.') }
})
</script>
<template>
  <VBtn class="mb-6" to="/courses" variant="text">Back to courses</VBtn>
  <VAlert v-if="error" class="mb-4" type="error">{{ error }}</VAlert>
  <VCard v-if="course" max-width="720" rounded="xl" variant="flat">
    <VCardItem><template #title>{{ course.title }}</template><template #subtitle>{{ course.code }}</template>
    </VCardItem>
    <VCardText>
      <VChip class="mb-4" :color="course.status === 'publish' ? 'success' : 'warning'" variant="tonal">{{ course.status
        }}
      </VChip>
      <div>Type: {{ course.type }}</div>
      <div>Sub-type: {{ course.sub_type }}</div>
    </VCardText>
    <VCardActions>
      <VBtn v-if="course.permissions?.change_status" color="secondary" variant="tonal" @click="changeStatus">Move to {{
        nextStatus[course.status || 'new'] }}</VBtn>
      <VBtn v-if="course.permissions?.update" :to="`/courses/${course.id}/edit`" color="primary">Edit course</VBtn>
    </VCardActions>
  </VCard>
</template>
