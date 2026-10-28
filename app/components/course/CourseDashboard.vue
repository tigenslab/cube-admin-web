<script setup lang="ts">
import CourseViewer from '~/components/course/CourseViewer.vue'
import CourseEditor from '~/components/course/CourseEditor.vue'
import type { Course } from '~/stores/courses'

const route = useRoute()
const router = useRouter()
const courses = useCoursesStore()
const course = ref<Awaited<ReturnType<typeof courses.show>> | null>(null)
const selectedVersion = ref<number | 'current' | null>(null)
const activeTab = ref('view-course')
const viewerKey = ref(0)
const error = ref('')
const statusLoading = ref(false)
const versionOptions = computed(() => {
  const options: { value: number | 'current'; label: string }[] = (course.value?.versions || [])
    .slice()
    .sort((a, b) => b.version - a.version)
    .map(item => ({ value: item.version, label: `Version ${item.version}` })) || []
  if (course.value?.permissions?.change_status) options.unshift({ value: 'current', label: 'Current' })
  return options
})
async function switchVersion(value: string | number) {
  const selection = value === 'current' ? 'current' : Number(value)
  if (!selection || selection === selectedVersion.value) return
  selectedVersion.value = selection
  activeTab.value = 'view-course'
  const segment = String(selection)
  await router.replace({ path: `/courses/${encodeURIComponent(String(route.params.id))}/${encodeURIComponent(segment)}/dashboard`, query: {} })
}

function updateCourse(courseUpdate: Course) {
  course.value = courseUpdate
  viewerKey.value += 1
}

async function refreshCourse() {
  if (!course.value) return
  statusLoading.value = true
  try {
    course.value = await courses.show(course.value.id)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to refresh course status.')
  } finally {
    statusLoading.value = false
  }
}

async function changeStatus(status: string) {
  if (!course.value) return
  error.value = ''
  statusLoading.value = true
  try {
    const updated = await courses.changeStatus(course.value.id, status)
    if ('job' in updated) {
      course.value.status = 'publishing'
      return
    }
    course.value = await courses.show(updated.id)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to change course status.')
  } finally {
    statusLoading.value = false
  }
}

onMounted(async () => {
  try {
    course.value = await courses.show(String(route.params.id))
    activeTab.value = course.value.permissions?.read ? 'view-course' : 'users'
    const requestedSegment = String(route.params.version || '')
    const validSelection = versionOptions.value.some(item => String(item.value) === requestedSegment)
    selectedVersion.value = validSelection
      ? (requestedSegment === 'current' ? 'current' : Number(requestedSegment))
      : (course.value.permissions?.change_status ? 'current' : versionOptions.value.find(item => item.value !== 'current')?.value ?? null)
    const canonicalSegment = String(selectedVersion.value || 'current')
    if (requestedSegment !== canonicalSegment || !requestedSegment) {
      await router.replace({ path: `/courses/${encodeURIComponent(course.value.id)}/${encodeURIComponent(canonicalSegment)}/dashboard` })
    }
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
        <VSelect
          v-if="course?.permissions?.read && versionOptions.length"
          :model-value="selectedVersion"
          class="version-select"
          density="compact"
          hide-details
          item-title="label"
          item-value="value"
          :items="versionOptions"
          label="Version"
          variant="outlined"
          @update:model-value="switchVersion($event)"
        />
        <VBtn v-if="course?.permissions?.change_status && selectedVersion === 'current' && course.status === 'new'" color="primary" prepend-icon="mdi-file-edit-outline" variant="flat" :loading="statusLoading" @click="changeStatus('draft')">Move to draft</VBtn>
        <VBtn v-if="course?.permissions?.change_status && selectedVersion === 'current' && course.status === 'draft'" color="primary" prepend-icon="mdi-check" variant="flat" :loading="statusLoading" @click="changeStatus('ready')">Mark as ready</VBtn>
        <VBtn v-if="course?.permissions?.change_status && selectedVersion === 'current' && course.status === 'ready'" color="primary" prepend-icon="mdi-publish" variant="flat" :loading="statusLoading" @click="changeStatus('published')">Publish</VBtn>
        <VBtn v-if="course?.permissions?.change_status && selectedVersion === 'current' && ['ready', 'published'].includes(course.status)" prepend-icon="mdi-file-edit-outline" variant="outlined" :loading="statusLoading" @click="changeStatus('draft')">Move to draft</VBtn>
        <VBtn v-if="selectedVersion === 'current' && course?.status === 'publishing'" color="info" prepend-icon="mdi-progress-clock" variant="tonal" disabled>Publishing…</VBtn>
        <VBtn v-if="selectedVersion === 'current' && course?.status === 'publishing' && course.permissions?.read" aria-label="Refresh course status" icon="mdi-refresh" variant="text" :loading="statusLoading" @click="refreshCourse" />
      </div>
    </div>

    <VAlert v-if="error" class="mx-6 mb-4" color="error" variant="tonal">{{ error }}</VAlert>

    <VTabs v-model="activeTab" color="primary">
      <VTab v-if="course?.permissions?.read" prepend-icon="mdi-eye-outline" value="view-course">View course</VTab>
      <VTab v-if="course?.permissions?.update && selectedVersion === 'current'" prepend-icon="mdi-pencil-outline" value="edit-course">Edit</VTab>
      <VTab v-if="selectedVersion !== 'current'" value="users">Users</VTab>
      <VTab v-if="selectedVersion !== 'current'" value="groups">Groups</VTab>
      <VTab v-if="selectedVersion !== 'current'" value="files">Files</VTab>
    </VTabs>

    <VWindow v-model="activeTab">
      <VWindowItem v-if="course?.permissions?.read" value="view-course">
        <CourseViewer :key="viewerKey" :course-id="course.id" embedded :selected-version="selectedVersion" />
      </VWindowItem>
      <VWindowItem v-if="course?.permissions?.update && selectedVersion === 'current'" value="edit-course">
        <CourseEditor :course-id="course.id" embedded @content-updated="viewerKey++" @course-updated="updateCourse" />
      </VWindowItem>
      <VWindowItem v-if="selectedVersion !== 'current'" value="users">
        <VCardText class="pa-6"><div class="text-body-2 text-medium-emphasis">Course users will appear here.</div></VCardText>
      </VWindowItem>
      <VWindowItem v-if="selectedVersion !== 'current'" value="groups">
        <VCardText class="pa-6"><div class="text-body-2 text-medium-emphasis">Course groups will appear here.</div></VCardText>
      </VWindowItem>
      <VWindowItem v-if="selectedVersion !== 'current'" value="files">
        <VCardText class="pa-6"><div class="text-body-2 text-medium-emphasis">Course files will appear here.</div></VCardText>
      </VWindowItem>
    </VWindow>
  </VCard>
</template>

<style scoped>
.version-select { min-width: 180px; }
</style>
