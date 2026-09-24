<script setup lang="ts">
import { storeToRefs } from 'pinia'

const coursesStore = useCoursesStore()
const { courses, loading, error } = storeToRefs(coursesStore)
const search = ref('')

onMounted(() => {
  coursesStore.search().catch(() => {
    // The store exposes request failures through error.
  })
})

const filteredCourses = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return courses.value

  return courses.value.filter(course => (
    `${course.title} ${course.code}`.toLowerCase().includes(query)
  ))
})

const nextStatus: Record<string, string> = { new: 'draft', draft: 'ready', ready: 'publish', publish: 'draft' }

async function changeStatus(course: { id: string; status: string }) {
  const next = nextStatus[course.status || 'new']
  if (!next) return
  try { await coursesStore.changeStatus(course.id, next) } catch (cause) { error.value = getApiErrorMessage(cause, 'Unable to change course status.') }
}

function contentCount(course: { content?: Record<string, unknown> }) {
  return Object.keys(course.content ?? {}).length
}

async function deleteCourse(id: string) {
  if (!confirm('Delete this course?')) return
  await coursesStore.remove(id)
}
</script>

<template>
  <section class="page-header mb-8">
    <div>
      <div class="text-overline text-primary font-weight-bold">LEARNING</div>
      <h1 class="text-h4 font-weight-bold mt-1">Courses</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">Manage your course catalogue and learning content.</p>
    </div>
    <VBtn color="primary" prepend-icon="mdi-plus" to="/courses/create">Create course</VBtn>
  </section>

  <VRow class="mb-4">
    <VCol cols="12" sm="6">
      <VCard rounded="xl" variant="flat">
        <VCardText class="d-flex align-center ga-4 pa-5">
          <VAvatar color="primary" rounded="lg" variant="tonal">
            <VIcon icon="mdi-book-open-page-variant-outline" />
          </VAvatar>
          <div>
            <div class="text-h5 font-weight-bold">{{ courses.length }}</div>
            <div class="text-body-2 text-medium-emphasis">Total courses</div>
          </div>
        </VCardText>
      </VCard>
    </VCol>
    <VCol cols="12" sm="6">
      <VCard rounded="xl" variant="flat">
        <VCardText class="d-flex align-center ga-4 pa-5">
          <VAvatar color="success" rounded="lg" variant="tonal">
            <VIcon icon="mdi-file-document-multiple-outline" />
          </VAvatar>
          <div>
            <div class="text-h5 font-weight-bold">{{ courses.filter(course => contentCount(course) > 0).length }}</div>
            <div class="text-body-2 text-medium-emphasis">Courses with content</div>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <VCard rounded="xl" variant="flat">
    <VProgressLinear v-if="loading" color="primary" indeterminate />
    <VCardItem class="pa-6 pb-3">
      <template #title>All courses</template>
      <template #subtitle>{{ filteredCourses.length }} courses</template>
    </VCardItem>

    <VCardText class="pa-6 pt-2">
      <VAlert v-if="error" class="mb-5" color="error" density="compact" variant="tonal">
        {{ error }}
      </VAlert>

      <VTextField
        v-model="search"
        class="course-search mb-5"
        density="comfortable"
        hide-details
        placeholder="Search title or code"
        prepend-inner-icon="mdi-magnify"
        rounded="lg"
        variant="solo-filled"
      />

      <VTable>
        <thead>
          <tr>
            <th>Course</th>
            <th>Code</th>
            <th>Status</th>
            <th class="d-none d-sm-table-cell">Content fields</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="course in filteredCourses" :key="course.id">
            <td>
              <div class="d-flex align-center ga-3 py-3">
                <VAvatar color="primary" rounded="lg" size="40" variant="tonal">
                  <VIcon icon="mdi-book-outline" />
                </VAvatar>
                <NuxtLink class="text-body-2 font-weight-medium" :to="`/courses/${course.id}`">{{ course.title }}</NuxtLink>
              </div>
            </td>
            <td><VChip size="small" variant="tonal">{{ course.code }}</VChip></td>
            <td><VChip :color="course.status === 'publish' ? 'success' : 'warning'" size="small" variant="tonal">{{ course.status || 'new' }}</VChip>
              <VBtn v-if="course.permissions?.change_status" class="ml-2" size="x-small" variant="text" @click="changeStatus(course)">{{ nextStatus[course.status || 'new'] }}</VBtn></td>
            <td class="d-none d-sm-table-cell text-medium-emphasis">{{ contentCount(course) }}</td>
            <td class="text-no-wrap">
              <VBtn v-if="course.permissions?.update" :to="`/courses/${course.id}/edit`" aria-label="Edit course" icon="mdi-pencil-outline" size="small" variant="text" />
              <VBtn v-if="course.permissions?.delete" aria-label="Delete course" icon="mdi-delete-outline" size="small" variant="text" @click="deleteCourse(course.id)" />
            </td>
          </tr>
        </tbody>
      </VTable>

      <div v-if="!loading && filteredCourses.length === 0" class="text-center py-12">
        <VIcon color="medium-emphasis" icon="mdi-book-search-outline" size="48" />
        <div class="text-subtitle-1 font-weight-medium mt-3">No courses found</div>
        <div class="text-body-2 text-medium-emphasis mt-1">Try a different search.</div>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
.page-header { align-items: flex-end; display: flex; justify-content: space-between; }
.course-search { max-width: 520px; }

@media (max-width: 600px) {
  .page-header { align-items: flex-start; flex-direction: column; gap: 20px; }
}
</style>
