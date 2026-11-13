<script setup lang="ts">
import type { Group } from '~/stores/groups'
import type { Course } from '~/stores/courses'
import type { User } from '~/stores/users'

const props = defineProps<{
  type?: 'all' | 'user' | 'course'
  showTypeTabs?: boolean
  showHeader?: boolean
}>()

const groupsStore = useGroupsStore()
const usersStore = useUsersStore()
const coursesStore = useCoursesStore()
const session = useSessionStore()
const route = useRoute()
const search = ref('')
const typeFilter = ref<'all' | 'user' | 'course'>(props.type || 'all')
const groupTypeLabel = computed(() => props.type === 'user' ? 'users' : props.type === 'course' ? 'courses' : 'users or courses')
const deletingId = ref('')
const userNames = ref(new Map<string, string>())
const courseNames = ref(new Map<string, string>())
const canCreateGroup = computed(() => Boolean(session.permissions.Group?.includes('create') || session.permissions.all?.includes('manage')))

watch(() => props.type, (value) => {
  if (value) typeFilter.value = value
}, { immediate: true })

watch(() => route.query.type, (value) => {
  if (props.type) return
  typeFilter.value = value === 'user' || value === 'course' ? value : 'all'
}, { immediate: true })

const selectedGroupTab = computed({
  get: () => typeFilter.value,
  set: (value: 'all' | 'user' | 'course') => {
    void navigateTo(value === 'all' ? '/groups' : { path: '/groups', query: { type: value } })
  },
})

const filteredGroups = computed(() => groupsStore.groups.filter(group => {
  const matchesType = typeFilter.value === 'all' || group.type === typeFilter.value
  const matchesSearch = `${group.title} ${group.description || ''}`.toLowerCase().includes(search.value.trim().toLowerCase())
  return matchesType && matchesSearch
}))
const createGroupTo = computed(() => ({ path: '/groups/create', query: typeFilter.value === 'all' ? {} : { type: typeFilter.value } }))

function memberNames(group: Group) {
  const names = group.type === 'user' ? userNames.value : courseNames.value
  return group.group_items.map(id => names.get(String(id)) || String(id))
}

function typeTitle(type: Group['type']) {
  return type === 'user' ? 'Users' : 'Courses'
}

async function loadGroups() {
  try {
    await groupsStore.search()
  } catch {
    // The store exposes request failures through error.
  }
}

async function deleteGroup(group: Group) {
  if (!group.permissions?.delete || !confirm(`Delete “${group.title}”?`)) return
  deletingId.value = group.id
  try {
    await groupsStore.remove(group.id)
  } catch {
    // The store exposes request failures through error.
  } finally {
    deletingId.value = ''
  }
}

onMounted(async () => {
  await Promise.all([loadGroups(), usersStore.index().catch(() => []), coursesStore.search().catch(() => [])])
  userNames.value = new Map(usersStore.users.map((user: User) => [String(user.id), [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || user.email || String(user.id)]))
  courseNames.value = new Map(coursesStore.courses.map((course: Course) => [String(course.id), [course.code, course.title].filter(Boolean).join(' — ') || course.id]))
})
</script>

<template>
  <section v-if="props.showHeader !== false" class="page-header mb-8">
    <div>
      <div class="text-overline text-primary font-weight-bold">WORKSPACE</div>
      <h1 class="text-h4 font-weight-bold mt-1">Groups</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">Organise {{ groupTypeLabel }} into groups.</p>
    </div>
    <VBtn v-if="canCreateGroup" color="primary" prepend-icon="mdi-account-multiple-plus-outline" :to="createGroupTo">Create group</VBtn>
  </section>

  <VTabs v-if="showTypeTabs !== false" v-model="selectedGroupTab" class="mb-6" color="primary">
    <VTab value="all">All groups</VTab>
    <VTab value="user">User groups</VTab>
    <VTab value="course">Course groups</VTab>
  </VTabs>

  <VAlert v-if="groupsStore.error" class="mb-4" color="error" variant="tonal">{{ groupsStore.error }}</VAlert>
  <VCard rounded="xl" variant="flat">
    <VProgressLinear v-if="groupsStore.loading" color="primary" indeterminate />
    <VCardText class="d-flex flex-wrap align-center ga-3 pa-5">
      <VTextField v-model="search" class="flex-grow-1" hide-details label="Search groups" prepend-inner-icon="mdi-magnify" variant="outlined" />
      <VSelect v-if="!props.type" v-model="typeFilter" :items="[{ title: 'All types', value: 'all' }, { title: 'User groups', value: 'user' }, { title: 'Course groups', value: 'course' }]" hide-details label="Type" style="max-width: 220px" variant="outlined" />
      <VBtn v-if="props.showHeader === false && canCreateGroup" color="primary" prepend-icon="mdi-account-multiple-plus-outline" :to="createGroupTo">Create group</VBtn>
    </VCardText>
    <VTable>
      <thead><tr><th>Group</th><th>Type</th><th>Members</th><th>Description</th><th aria-label="Actions" /></tr></thead>
      <tbody>
        <tr v-for="group in filteredGroups" :key="group.id">
          <td><NuxtLink class="font-weight-medium" :to="`/groups/${encodeURIComponent(group.id)}`">{{ group.title }}</NuxtLink></td>
          <td><VChip size="small" variant="tonal">{{ typeTitle(group.type) }}</VChip></td>
          <td>
            <div v-if="memberNames(group).length" class="d-flex flex-wrap ga-1">
              <VChip v-for="name in memberNames(group).slice(0, 3)" :key="name" size="small" variant="tonal">{{ name }}</VChip>
              <VChip v-if="memberNames(group).length > 3" size="small" variant="text">+{{ memberNames(group).length - 3 }} more</VChip>
            </div>
            <span v-else class="text-medium-emphasis">No members</span>
          </td>
          <td class="description-cell">{{ group.description || '—' }}</td>
          <td class="text-no-wrap">
            <VBtn v-if="group.permissions?.update" :to="`/groups/${encodeURIComponent(group.id)}/edit`" aria-label="Edit group" icon="mdi-pencil-outline" size="small" variant="text" />
            <VBtn v-if="group.permissions?.delete" :loading="deletingId === group.id" aria-label="Delete group" color="error" icon="mdi-delete-outline" size="small" variant="text" @click="deleteGroup(group)" />
          </td>
        </tr>
      </tbody>
    </VTable>
    <div v-if="!groupsStore.loading && !filteredGroups.length" class="py-12 text-center text-body-2 text-medium-emphasis">No groups found.</div>
  </VCard>
</template>

<style scoped>
.page-header { align-items: flex-end; display: flex; justify-content: space-between; }
.description-cell { max-width: 320px; }
@media (max-width: 600px) { .page-header { align-items: flex-start; flex-direction: column; gap: 20px; } }
</style>
