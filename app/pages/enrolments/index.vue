<script setup lang="ts">
const store = useEnrolmentsApi()
const session = useSessionStore()
const canCreateEnrolment = computed(() => Boolean(
  session.permissions.Enrolment?.includes('create') || session.permissions.all?.includes('manage'),
))
onMounted(() => store.search())

function personName(person?: { first_name?: string; last_name?: string; username?: string; email?: string } | null) {
  if (!person) return 'Unavailable user'
  return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username || person.email || 'Unnamed user'
}

async function remove(id: string) {
  if (confirm('Remove this enrolment?')) await store.remove(id)
}
</script>

<template>
  <section class="page-header mb-8">
    <div>
      <div class="text-overline text-primary font-weight-bold">LEARNING</div>
      <h1 class="text-h4 font-weight-bold mt-1">Enrolments</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">View course enrolments and trainer assignments.</p>
    </div>
    <VBtn v-if="canCreateEnrolment" color="primary" prepend-icon="mdi-account-plus" to="/enrolments/create">Enrol learner</VBtn>
  </section>

  <VAlert v-if="store.error" class="mb-4" color="error" variant="tonal">{{ store.error }}</VAlert>
  <VCard rounded="xl" variant="flat">
    <VProgressLinear v-if="store.loading" color="primary" indeterminate />
    <VTable>
      <thead>
        <tr><th>Course</th><th>Learner</th><th>Trainers</th><th>Enrolled</th><th aria-label="Actions" /></tr>
      </thead>
      <tbody>
        <tr v-for="item in store.enrolments" :key="item.id">
          <td>
            <div class="font-weight-medium">{{ item.course?.title || 'Unavailable course' }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.course?.code || item.course_id }}</div>
          </td>
          <td>{{ personName(item.learner) }}</td>
          <td>
            <div v-if="item.trainers?.length" class="d-flex flex-wrap ga-1">
              <VChip v-for="trainer in item.trainers" :key="trainer.id" size="small" variant="tonal">{{ personName(trainer) }}</VChip>
            </div>
            <span v-else class="text-medium-emphasis">No trainers assigned</span>
          </td>
          <td class="text-medium-emphasis">{{ item.created_at ? new Date(item.created_at).toLocaleDateString() : '—' }}</td>
          <td class="text-no-wrap">
            <VBtn v-if="item.permissions?.update" :to="`/enrolments/${item.id}/edit`" aria-label="Assign trainers" icon="mdi-account-multiple-plus-outline" size="small" variant="text" />
            <VBtn v-if="item.permissions?.delete" aria-label="Remove enrolment" color="error" icon="mdi-delete-outline" size="small" variant="text" @click="remove(item.id)" />
          </td>
        </tr>
      </tbody>
    </VTable>
    <div v-if="!store.loading && store.enrolments.length === 0" class="text-center py-12 text-medium-emphasis">No enrolments yet.</div>
  </VCard>
</template>

<style scoped>
.page-header { align-items: flex-end; display: flex; justify-content: space-between; }
@media (max-width: 600px) { .page-header { align-items: flex-start; flex-direction: column; gap: 20px; } }
</style>
