<script setup lang="ts">
import type { Group, GroupInput } from '~/stores/groups'

const route = useRoute()
const router = useRouter()
const groups = useGroupsStore()
const group = ref<Group | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const id = String(route.params.id)

onMounted(async () => {
  try {
    group.value = await groups.show(id)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load the group.')
  } finally {
    loading.value = false
  }
})

async function saveGroup(data: GroupInput) {
  error.value = ''
  saving.value = true
  try {
    await groups.update(id, data)
    await router.push(`/groups/${encodeURIComponent(id)}`)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to update the group.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <VContainer>
    <VBtn class="mb-6" prepend-icon="mdi-arrow-left" :to="`/groups/${encodeURIComponent(id)}`" variant="text">Back to group</VBtn>
    <h1 class="text-h4 font-weight-bold mb-6">Edit group</h1>
    <VProgressLinear v-if="loading" class="mb-4" color="primary" indeterminate />
    <VAlert v-if="error" class="mb-4" color="error" variant="tonal">{{ error }}</VAlert>
    <VCard v-if="group" class="pa-6" max-width="760" rounded="xl" variant="flat">
      <GroupsGroupForm :key="group.id" :model-value="group" :loading="saving" submit-label="Save changes" @cancel="router.push(`/groups/${encodeURIComponent(id)}`)" @submit="saveGroup" />
    </VCard>
  </VContainer>
</template>
