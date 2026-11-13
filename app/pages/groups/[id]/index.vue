<script setup lang="ts">
import type { Course } from '~/stores/courses'
import type { Group } from '~/stores/groups'
import type { User } from '~/stores/users'

const route = useRoute()
const groups = useGroupsStore()
const users = useUsersStore()
const courses = useCoursesStore()
const group = ref<Group | null>(null)
const itemNames = ref(new Map<string, string>())
const error = ref('')
const loading = ref(true)
const deleting = ref(false)

const itemLinks = computed(() => (group.value?.group_items || []).map(id => ({
  id,
  title: itemNames.value.get(String(id)) || String(id),
  to: group.value?.type === 'user' ? `/users/${encodeURIComponent(id)}` : `/courses/${encodeURIComponent(id)}/dashboard`,
})))

async function deleteGroup() {
  if (!group.value || !group.value.permissions?.delete || !confirm(`Delete “${group.value.title}”?`)) return
  deleting.value = true
  try {
    await groups.remove(group.value.id)
    await navigateTo('/groups')
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to delete the group.')
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  try {
    group.value = await groups.show(String(route.params.id))
    if (group.value.type === 'user') {
      const values = await users.index()
      itemNames.value = new Map(values.map((user: User) => [String(user.id), [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || user.email || String(user.id)]))
    } else {
      const values = await courses.search()
      itemNames.value = new Map(values.map((course: Course) => [String(course.id), [course.code, course.title].filter(Boolean).join(' — ') || course.id]))
    }
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load the group.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <VContainer>
    <VBtn class="mb-6" prepend-icon="mdi-arrow-left" to="/groups" variant="text">Back to groups</VBtn>
    <VProgressLinear v-if="loading" color="primary" indeterminate />
    <VAlert v-if="error" class="mb-4" color="error" variant="tonal">{{ error }}</VAlert>
    <template v-if="group">
      <section class="page-header mb-6">
        <div>
          <div class="text-overline text-primary font-weight-bold">{{ group.type === 'user' ? 'USER GROUP' : 'COURSE GROUP' }}</div>
          <h1 class="text-h4 font-weight-bold mt-1">{{ group.title }}</h1>
          <p class="text-body-1 text-medium-emphasis mt-2">{{ group.description || 'No description.' }}</p>
        </div>
        <div class="d-flex ga-2">
          <VBtn v-if="group.permissions?.update" color="primary" prepend-icon="mdi-pencil-outline" :to="`/groups/${encodeURIComponent(group.id)}/edit`">Edit</VBtn>
          <VBtn v-if="group.permissions?.delete" color="error" prepend-icon="mdi-delete-outline" variant="outlined" :loading="deleting" @click="deleteGroup">Delete</VBtn>
        </div>
      </section>
      <VCard rounded="xl" variant="flat">
        <VCardTitle class="pa-6">{{ group.type === 'user' ? 'Users' : 'Courses' }} <span class="text-medium-emphasis">({{ itemLinks.length }})</span></VCardTitle>
        <VList v-if="itemLinks.length" lines="two">
          <VListItem v-for="item in itemLinks" :key="item.id" :to="item.to" :title="item.title" :subtitle="item.id" />
        </VList>
        <div v-else class="px-6 pb-6 text-body-2 text-medium-emphasis">This group has no items.</div>
      </VCard>
    </template>
  </VContainer>
</template>

<style scoped>
.page-header { align-items: flex-end; display: flex; justify-content: space-between; }
@media (max-width: 600px) { .page-header { align-items: flex-start; flex-direction: column; gap: 20px; } }
</style>
