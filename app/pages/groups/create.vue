<script setup lang="ts">
import type { GroupInput } from '~/stores/groups'

const groups = useGroupsStore()
const router = useRouter()
const route = useRoute()
const error = ref('')
const saving = ref(false)
const initialGroup = computed<Partial<GroupInput>>(() => ({
  type: route.query.type === 'course' ? 'course' : 'user',
  group_items: route.query.type === 'course' && typeof route.query.course_id === 'string' ? [route.query.course_id] : [],
}))

async function createGroup(data: GroupInput) {
  error.value = ''
  saving.value = true
  try {
    const group = await groups.create(data)
    await router.push(`/groups/${encodeURIComponent(group.id)}`)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to create the group.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <VContainer>
    <VBtn class="mb-6" prepend-icon="mdi-arrow-left" to="/groups" variant="text">Back to groups</VBtn>
    <h1 class="text-h4 font-weight-bold mb-6">Create group</h1>
    <VAlert v-if="error" class="mb-4" color="error" variant="tonal">{{ error }}</VAlert>
    <VCard class="pa-6" max-width="760" rounded="xl" variant="flat">
      <GroupsGroupForm :model-value="initialGroup" :loading="saving" submit-label="Create group" @cancel="router.push('/groups')" @submit="createGroup" />
    </VCard>
  </VContainer>
</template>
