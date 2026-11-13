<script setup lang="ts">
import type { Course } from '~/stores/courses'
import type { GroupInput, GroupType } from '~/stores/groups'
import type { User } from '~/stores/users'

const props = withDefaults(defineProps<{
  modelValue?: Partial<GroupInput>
  loading?: boolean
  submitLabel?: string
}>(), {
  loading: false,
  submitLabel: 'Save group',
})
const emit = defineEmits<{
  submit: [value: GroupInput]
  cancel: []
}>()

const users = useUsersStore()
const courses = useCoursesStore()
const form = reactive<GroupInput>({
  title: props.modelValue?.title || '',
  description: props.modelValue?.description || '',
  type: props.modelValue?.type || 'user',
  group_items: [...(props.modelValue?.group_items || [])],
})
const options = ref<{ title: string; value: string }[]>([])
const loadingOptions = ref(false)
const optionsError = ref('')
const validationError = ref('')
const groupTypes = [
  { title: 'Users', value: 'user' },
  { title: 'Courses', value: 'course' },
]

watch(() => props.modelValue, (value) => {
  if (!value) return
  form.title = value.title || ''
  form.description = value.description || ''
  form.type = value.type || 'user'
  form.group_items = [...(value.group_items || [])]
}, { immediate: true })

watch(() => form.type, async (type, previousType) => {
  if (previousType && type !== previousType) form.group_items = []
  await loadOptions(type)
}, { immediate: true })

function userTitle(user: User) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || user.email || String(user.id)
}

function courseTitle(course: Course) {
  return [course.code, course.title].filter(Boolean).join(' — ') || course.id
}

async function loadOptions(type: GroupType) {
  loadingOptions.value = true
  optionsError.value = ''
  try {
    if (type === 'user') {
      const values = await users.index()
      options.value = values.map(user => ({ title: userTitle(user), value: String(user.id) }))
    } else {
      const values = await courses.search()
      options.value = values.map(course => ({ title: courseTitle(course), value: String(course.id) }))
    }
  } catch (cause) {
    optionsError.value = getApiErrorMessage(cause, `Unable to load ${type} group items.`)
  } finally {
    loadingOptions.value = false
  }
}

function submit() {
  validationError.value = ''
  if (!form.title.trim()) {
    validationError.value = 'Enter a group title.'
    return
  }
  emit('submit', {
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type,
    group_items: [...new Set(form.group_items.map(String).filter(Boolean))],
  })
}
</script>

<template>
  <VForm @submit.prevent="submit">
    <VAlert v-if="validationError" class="mb-4" color="error" variant="tonal">{{ validationError }}</VAlert>
    <VAlert v-if="optionsError" class="mb-4" color="error" variant="tonal">{{ optionsError }}</VAlert>
    <VTextField v-model="form.title" class="mb-3" label="Title" maxlength="200" required variant="outlined" />
    <VTextarea v-model="form.description" class="mb-3" label="Description" maxlength="5000" rows="3" variant="outlined" />
    <VSelect v-model="form.type" :items="groupTypes" item-title="title" item-value="value" label="Group type" variant="outlined" />
    <VAutocomplete
      v-model="form.group_items"
      :items="options"
      :loading="loadingOptions"
      :disabled="loadingOptions || Boolean(optionsError)"
      item-title="title"
      item-value="value"
      :label="form.type === 'user' ? 'Users in group' : 'Courses in group'"
      chips
      closable-chips
      multiple
      variant="outlined"
    />
    <div v-if="!loadingOptions && !optionsError && !options.length" class="text-body-2 text-medium-emphasis mb-4">
      No {{ form.type === 'user' ? 'users' : 'courses' }} are available in this account.
    </div>
    <div class="d-flex justify-end ga-2 mt-4">
      <VBtn variant="text" @click="emit('cancel')">Cancel</VBtn>
      <VBtn color="primary" :loading="loading" :disabled="loading || loadingOptions || Boolean(optionsError)" type="submit">{{ submitLabel }}</VBtn>
    </div>
  </VForm>
</template>
