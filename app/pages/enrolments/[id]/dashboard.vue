<script setup lang="ts">
import type { Enrolment } from '~/stores/enrolments'
import CourseViewer from '~/components/course/CourseViewer.vue'

const route = useRoute()
const enrolmentsApi = useEnrolmentsStore()
const enrolment = ref<Enrolment | null>(null)
const loading = ref(true)
const error = ref('')
const enrolmentId = String(route.params.id)

function personName(person?: Enrolment['learner']) {
  if (!person) return 'Unavailable user'
  return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username || person.email || 'Unnamed user'
}

onMounted(async () => {
  try {
    enrolment.value = (await enrolmentsApi.search()).find(item => String(item.id) === enrolmentId) || null
    if (!enrolment.value) error.value = 'This enrolment could not be found.'
    else await enrolmentsApi.recordActivity(enrolmentId, { activity_type: 'view_course' })
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load this enrolment.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="page-header mb-6">
    <div>
      <div class="text-overline text-primary font-weight-bold">ENROLMENT</div>
      <h1 class="text-h4 font-weight-bold mt-1">{{ enrolment?.course?.title || 'Enrolment dashboard' }}</h1>
      <p v-if="enrolment" class="text-body-1 text-medium-emphasis mt-2">
        {{ personName(enrolment.learner) }} · {{ (enrolment.status || 'new').replaceAll('_', ' ') }}
      </p>
    </div>
    <VBtn variant="text" to="/enrolments">Back to enrolments</VBtn>
  </section>

  <VAlert v-if="error" class="mb-4" color="error" variant="tonal">{{ error }}</VAlert>
  <VProgressLinear v-if="loading" class="mb-4" color="primary" indeterminate />
  <template v-else-if="enrolment">
    <VCard class="mb-6" rounded="xl" variant="flat">
      <VCardText class="d-flex flex-wrap ga-8">
        <div><div class="text-caption text-medium-emphasis">Learner</div><div class="font-weight-medium">{{ personName(enrolment.learner) }}</div></div>
        <div><div class="text-caption text-medium-emphasis">Course</div><div class="font-weight-medium">{{ enrolment.course?.code || enrolment.course_id }}</div></div>
        <div><div class="text-caption text-medium-emphasis">Enrolled</div><div class="font-weight-medium">{{ enrolment.created_at ? new Date(enrolment.created_at).toLocaleDateString() : '—' }}</div></div>
        <div><div class="text-caption text-medium-emphasis">Status</div><div class="font-weight-medium text-capitalize">{{ (enrolment.status || 'new').replaceAll('_', ' ') }}</div></div>
      </VCardText>
    </VCard>
    <CourseViewer :course-id="enrolment.course_id" :enrolment-id="enrolment.id" embedded :selected-version="'current'" />
  </template>
</template>

<style scoped>
.page-header { align-items: flex-end; display: flex; justify-content: space-between; }
@media (max-width: 600px) { .page-header { align-items: flex-start; flex-direction: column; gap: 12px; } }
</style>
