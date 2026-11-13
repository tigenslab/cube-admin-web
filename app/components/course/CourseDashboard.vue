<script setup lang="ts">
import CourseViewer from '~/components/course/CourseViewer.vue'
import CourseEditor from '~/components/course/CourseEditor.vue'
import type { Course } from '~/stores/courses'
import type { Enrolment } from '~/stores/enrolments'
import type { Group } from '~/stores/groups'
import { displayCourseTitle } from '~/utils/course-display'

const route = useRoute()
const router = useRouter()
const courses = useCoursesStore()
const catalogueApi = useCatalogueStore()
const enrolmentsApi = useEnrolmentsStore()
const groupsApi = useGroupsStore()
const session = useSessionStore()
const course = ref<Awaited<ReturnType<typeof courses.show>> | null>(null)
const selectedVersion = ref<number | 'current' | null>(null)
const catalogueVersions = ref<number[]>([])
const activeTab = ref('view-course')
const viewerKey = ref(0)
const error = ref('')
const statusLoading = ref(false)
const courseEnrolments = ref<Enrolment[]>([])
const courseGroups = ref<Group[]>([])
const groupsLoading = ref(false)
const groupsError = ref('')
const loadedGroupsFor = ref('')
const usersLoading = ref(false)
const usersError = ref('')
const loadedEnrolmentsFor = ref('')
const enrolUserDialog = ref(false)
const loadingLearners = ref(false)
const learnerOptions = ref<{ title: string; value: string }[]>([])
const trainerOptions = ref<{ title: string; value: string }[]>([])
const selectedLearnerId = ref('')
const selectedTrainerIds = ref<string[]>([])
const enrolUserError = ref('')
const trainerDialog = ref(false)
const editingEnrolment = ref<Enrolment | null>(null)
const editingTrainerOptions = ref<{ title: string; value: string }[]>([])
const editingTrainerIds = ref<string[]>([])
const loadingTrainerForm = ref(false)
const savingTrainerAssignments = ref(false)
const trainerEditError = ref('')
const canEnrolUser = computed(() => Boolean(
  session.permissions.Enrolment?.includes('create') || session.permissions.all?.includes('manage'),
))
const canReadGroups = computed(() => Boolean(
  session.permissions.Group?.includes('read') || session.permissions.all?.includes('manage'),
))
const canCreateGroups = computed(() => Boolean(
  session.permissions.Group?.includes('create') || session.permissions.all?.includes('manage'),
))
const isCatalogueLinked = computed(() => Boolean(course.value?.catalogue_course_id))
const versionOptions = computed(() => {
  if (isCatalogueLinked.value) return catalogueVersions.value.map(version => ({ value: version, label: `Version ${version}` }))
  const options: { value: number | 'current'; label: string }[] = (course.value?.versions || [])
    .slice()
    .sort((a, b) => b.version - a.version)
    .map(item => ({ value: item.version, label: `Version ${item.version}` })) || []
  if (course.value?.permissions?.change_status || course.value?.permissions?.update) options.unshift({ value: 'current', label: 'Current' })
  return options
})
function defaultTabForVersion(version: number | 'current' | null) {
  if (version === 'current' && course.value?.permissions?.update) return 'view-course'
  if (course.value?.permissions?.read) return 'view-course'
  return 'users'
}
function dashboardPath(courseId: string, version: number | 'current') {
  const coursePath = `/courses/${encodeURIComponent(courseId)}`
  return version === 'current' ? `${coursePath}/dashboard` : `${coursePath}/${version}/dashboard`
}
async function switchVersion(value: string | number) {
  const selection = value === 'current' ? 'current' : Number(value)
  if (!selection || selection === selectedVersion.value) return
  selectedVersion.value = selection
  if (course.value) await router.push({ path: dashboardPath(course.value.id, selection) })
  await nextTick()
  activeTab.value = defaultTabForVersion(selection)
}

function updateCourse(courseUpdate: Course) {
  course.value = courseUpdate
  viewerKey.value += 1
}

function personName(person?: Enrolment['learner']) {
  if (!person) return 'Unavailable user'
  return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username || person.email || 'Unnamed user'
}

function trainerIdsFromSelection(value: unknown): string[] {
  const ids = Array.isArray(value) ? value : value == null || value === '' ? [] : [value]
  return [...new Set(ids.map(String).filter(Boolean))]
}

function updateSelectedTrainer(trainerId: string, selected: unknown) {
  const ids = new Set(selectedTrainerIds.value)
  if (selected === true) ids.add(trainerId)
  else ids.delete(trainerId)
  selectedTrainerIds.value = [...ids]
}

function updateEditingTrainer(trainerId: string, selected: unknown) {
  const ids = new Set(editingTrainerIds.value)
  if (selected === true) ids.add(trainerId)
  else ids.delete(trainerId)
  editingTrainerIds.value = [...ids]
}

async function loadCourseEnrolments(force = false) {
  const courseId = course.value?.id
  if (!courseId || usersLoading.value || (!force && loadedEnrolmentsFor.value === courseId)) return
  usersLoading.value = true
  usersError.value = ''
  try {
    const enrolments = await enrolmentsApi.search()
    courseEnrolments.value = enrolments.filter(item => String(item.course_id) === String(courseId))
    loadedEnrolmentsFor.value = courseId
  } catch (cause) {
    usersError.value = getApiErrorMessage(cause, 'Unable to load course users.')
  } finally {
    usersLoading.value = false
  }
}

async function loadCourseGroups(force = false) {
  const courseId = course.value?.id
  if (!courseId || !canReadGroups.value || groupsLoading.value || (!force && loadedGroupsFor.value === courseId)) return
  groupsLoading.value = true
  groupsError.value = ''
  try {
    const groups = await groupsApi.search({ type: 'course' })
    courseGroups.value = groups.filter(group => group.group_items.some(id => String(id) === String(courseId)))
    loadedGroupsFor.value = courseId
  } catch (cause) {
    groupsError.value = getApiErrorMessage(cause, 'Unable to load course groups.')
  } finally {
    groupsLoading.value = false
  }
}

async function openEnrolUserDialog() {
  enrolUserDialog.value = true
  loadingLearners.value = true
  enrolUserError.value = ''
  selectedLearnerId.value = ''
  selectedTrainerIds.value = []
  learnerOptions.value = []
  trainerOptions.value = []
  try {
    await loadCourseEnrolments()
    const { vjsf } = await enrolmentsApi.newForm()
    const enrolledIds = new Set(courseEnrolments.value.map(item => String(item.learner_id)))
    const options = vjsf.schema.properties?.learner_id?.oneOf || []
    learnerOptions.value = options
      .filter(option => option.const != null && !enrolledIds.has(String(option.const)))
      .map(option => ({ title: option.title || String(option.const), value: String(option.const) }))
    const trainerChoices = vjsf.schema.properties?.trainer_ids?.items?.oneOf || []
    trainerOptions.value = trainerChoices
      .filter(option => option.const != null)
      .map(option => ({ title: option.title || String(option.const), value: String(option.const) }))
    selectedLearnerId.value = learnerOptions.value[0]?.value || ''
  } catch (cause) {
    enrolUserError.value = getApiErrorMessage(cause, 'Unable to load available learners.')
  } finally {
    loadingLearners.value = false
  }
}

async function enrolUser() {
  if (!course.value || !selectedLearnerId.value) return
  enrolUserError.value = ''
  try {
    await enrolmentsApi.create({
      course_id: String(course.value.id),
      learner_id: selectedLearnerId.value,
      trainer_ids: trainerIdsFromSelection(selectedTrainerIds.value),
    })
    enrolUserDialog.value = false
    await loadCourseEnrolments(true)
  } catch (cause) {
    enrolUserError.value = getApiErrorMessage(cause, 'Unable to enrol the user.')
  }
}

async function deleteEnrolment(item: Enrolment) {
  if (!item.permissions?.delete || !confirm('Remove this enrolment?')) return
  usersError.value = ''
  try {
    await enrolmentsApi.remove(item.id)
    courseEnrolments.value = courseEnrolments.value.filter(enrolment => enrolment.id !== item.id)
  } catch (cause) {
    usersError.value = getApiErrorMessage(cause, 'Unable to remove the enrolment.')
  }
}

async function openTrainerAssignment(item: Enrolment) {
  if (!item.permissions?.update) return
  editingEnrolment.value = item
  trainerDialog.value = true
  loadingTrainerForm.value = true
  trainerEditError.value = ''
  editingTrainerOptions.value = []
  editingTrainerIds.value = []
  try {
    const { vjsf } = await enrolmentsApi.editForm(item.id)
    const trainerField = vjsf.schema.properties?.trainer_ids
    const choices = trainerField?.items?.oneOf || []
    editingTrainerOptions.value = choices
      .filter(option => option.const != null)
      .map(option => ({ title: option.title || String(option.const), value: String(option.const) }))
    editingTrainerIds.value = (vjsf.model.trainer_ids || []).map(String)
  } catch (cause) {
    trainerEditError.value = getApiErrorMessage(cause, 'Unable to load trainer assignments.')
  } finally {
    loadingTrainerForm.value = false
  }
}

async function saveTrainerAssignments() {
  if (!editingEnrolment.value) return
  savingTrainerAssignments.value = true
  trainerEditError.value = ''
  try {
    await enrolmentsApi.updateTrainers(editingEnrolment.value.id, editingTrainerIds.value)
    trainerDialog.value = false
    await loadCourseEnrolments(true)
  } catch (cause) {
    trainerEditError.value = getApiErrorMessage(cause, 'Unable to update trainers.')
  } finally {
    savingTrainerAssignments.value = false
  }
}

watch([activeTab, () => course.value?.id], ([tab, courseId]) => {
  if (tab === 'users' && courseId) void loadCourseEnrolments()
  if (tab === 'groups' && courseId) void loadCourseGroups()
})

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
    const requestedSegment = String(route.params.version || '')
    if (course.value.catalogue_course_id) {
      const catalogueCourse = await catalogueApi.course(course.value.catalogue_course_id)
      catalogueVersions.value = catalogueCourse.versions
      const catalogueVersion = catalogueVersions.value.includes(Number(requestedSegment))
        ? Number(requestedSegment)
        : catalogueCourse.version
      selectedVersion.value = catalogueVersion
      activeTab.value = 'view-course'
      if (requestedSegment !== String(catalogueVersion)) {
        await router.replace({ path: dashboardPath(course.value.id, catalogueVersion) })
      }
      return
    }
    const validSelection = versionOptions.value.some(item => String(item.value) === requestedSegment)
    selectedVersion.value = validSelection
      ? (requestedSegment === 'current' ? 'current' : Number(requestedSegment))
      : (course.value.permissions?.change_status ? 'current' : versionOptions.value.find(item => item.value !== 'current')?.value ?? null)
    activeTab.value = defaultTabForVersion(selectedVersion.value)
    const canonicalSegment = String(selectedVersion.value || 'current')
    if (requestedSegment !== canonicalSegment || !requestedSegment || requestedSegment === 'current') {
      await router.replace({ path: dashboardPath(course.value.id, selectedVersion.value || 'current') })
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
        <h1 class="text-h5 font-weight-bold">{{ course ? displayCourseTitle(course) : '' }}<span v-if="course && !isCatalogueLinked"> ({{ course.status || 'new' }})</span></h1>
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
        <template v-if="!isCatalogueLinked">
          <VBtn v-if="course?.permissions?.change_status && selectedVersion === 'current' && course.status === 'new'" color="primary" prepend-icon="mdi-file-edit-outline" variant="flat" :loading="statusLoading" @click="changeStatus('draft')">Move to draft</VBtn>
          <VBtn v-if="course?.permissions?.change_status && selectedVersion === 'current' && course.status === 'draft'" color="primary" prepend-icon="mdi-check" variant="flat" :loading="statusLoading" @click="changeStatus('ready')">Mark as ready</VBtn>
          <VBtn v-if="course?.permissions?.change_status && selectedVersion === 'current' && course.status === 'ready'" color="primary" prepend-icon="mdi-publish" variant="flat" :loading="statusLoading" @click="changeStatus('published')">Publish</VBtn>
          <VBtn v-if="course?.permissions?.change_status && selectedVersion === 'current' && ['ready', 'published'].includes(course.status)" prepend-icon="mdi-file-edit-outline" variant="outlined" :loading="statusLoading" @click="changeStatus('draft')">Move to draft</VBtn>
          <VBtn v-if="selectedVersion === 'current' && course?.status === 'publishing'" color="info" prepend-icon="mdi-progress-clock" variant="tonal" disabled>Publishing…</VBtn>
          <VBtn v-if="selectedVersion === 'current' && course?.status === 'publishing' && course.permissions?.read" aria-label="Refresh course status" icon="mdi-refresh" variant="text" :loading="statusLoading" @click="refreshCourse" />
        </template>
      </div>
    </div>

    <VAlert v-if="error" class="mx-6 mb-4" color="error" variant="tonal">{{ error }}</VAlert>

    <template v-if="course && selectedVersion !== null">
      <VTabs v-model="activeTab" color="primary">
        <VTab v-if="course.permissions?.read && !(course.permissions?.update && selectedVersion === 'current')" prepend-icon="mdi-eye-outline" value="view-course">View course</VTab>
        <VTab v-if="course.permissions?.update && selectedVersion === 'current'" prepend-icon="mdi-pencil-outline" value="view-course">View course</VTab>
        <VTab value="users">Users</VTab>
        <VTab v-if="canReadGroups" value="groups">Groups</VTab>
        <VTab value="files">Files</VTab>
      </VTabs>

      <VWindow v-model="activeTab">
        <VWindowItem v-if="course.permissions?.read && !(course.permissions?.update && selectedVersion === 'current')" value="view-course">
          <CourseViewer :key="viewerKey" :course-id="course.id" embedded :selected-version="selectedVersion" />
        </VWindowItem>
        <VWindowItem v-if="course.permissions?.update && selectedVersion === 'current'" value="view-course">
          <CourseEditor :course-id="course.id" embedded @content-updated="viewerKey++" @course-updated="updateCourse" />
        </VWindowItem>
        <VWindowItem value="users">
          <VCardText class="pa-6">
            <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
              <div class="text-h6">Enrolled users</div>
              <VBtn v-if="canEnrolUser" color="primary" prepend-icon="mdi-account-plus" @click="openEnrolUserDialog">Enrol user</VBtn>
            </div>
            <VAlert v-if="usersError" class="mb-4" color="error" variant="tonal">{{ usersError }}</VAlert>
            <VProgressLinear v-if="usersLoading" class="mb-3" color="primary" indeterminate />
            <VTable v-if="courseEnrolments.length" density="comfortable">
              <thead><tr><th>Learner</th><th>Email</th><th>Trainers</th><th>Enrolled</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                <tr v-for="item in courseEnrolments" :key="item.id">
                  <td>{{ personName(item.learner) }}</td>
                  <td>{{ item.learner?.email || '—' }}</td>
                  <td>
                    <div v-if="item.trainers?.length" class="d-flex flex-wrap ga-1">
                      <VChip v-for="trainer in item.trainers" :key="trainer.id" size="small" variant="tonal">{{ personName(trainer) }}</VChip>
                    </div>
                    <span v-else class="text-medium-emphasis">No trainers assigned</span>
                  </td>
                  <td>{{ item.created_at ? new Date(item.created_at).toLocaleDateString() : '—' }}</td>
                  <td class="text-no-wrap">
                    <VBtn
                      v-if="item.permissions?.update"
                      aria-label="Assign trainers"
                      icon="mdi-account-multiple-plus-outline"
                      size="small"
                      variant="text"
                      @click="openTrainerAssignment(item)"
                    />
                    <VBtn
                      v-if="item.permissions?.delete"
                      aria-label="Remove enrolment"
                      color="error"
                      icon="mdi-delete-outline"
                      size="small"
                      variant="text"
                      @click="deleteEnrolment(item)"
                    />
                  </td>
                </tr>
              </tbody>
            </VTable>
            <div v-else-if="!usersLoading && !usersError" class="py-8 text-center text-body-2 text-medium-emphasis">No users are enrolled in this course yet.</div>
          </VCardText>
        </VWindowItem>
        <VWindowItem v-if="canReadGroups" value="groups">
          <VCardText class="pa-6">
            <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
              <div class="text-h6">Groups containing this course</div>
              <div class="d-flex ga-2">
                <VBtn v-if="canCreateGroups" color="primary" prepend-icon="mdi-account-multiple-plus-outline" :to="{ path: '/groups/create', query: { type: 'course', course_id: course.id } }">Create group</VBtn>
                <VBtn prepend-icon="mdi-open-in-new" to="/groups" variant="outlined">Manage groups</VBtn>
              </div>
            </div>
            <VAlert v-if="groupsError" class="mb-4" color="error" variant="tonal">{{ groupsError }}</VAlert>
            <VProgressLinear v-if="groupsLoading" class="mb-3" color="primary" indeterminate />
            <VList v-if="courseGroups.length" lines="two">
              <VListItem v-for="group in courseGroups" :key="group.id" :to="`/groups/${encodeURIComponent(group.id)}`" :title="group.title" :subtitle="group.description || `${group.group_items.length} courses in this group`" prepend-icon="mdi-account-multiple-outline">
                <template #append>
                  <VBtn v-if="group.permissions?.update" :to="`/groups/${encodeURIComponent(group.id)}/edit`" aria-label="Edit group" icon="mdi-pencil-outline" size="small" variant="text" />
                </template>
              </VListItem>
            </VList>
            <div v-else-if="!groupsLoading && !groupsError" class="py-8 text-center text-body-2 text-medium-emphasis">This course is not in any groups yet.</div>
          </VCardText>
        </VWindowItem>
        <VWindowItem value="files">
          <VCardText class="pa-6"><div class="text-body-2 text-medium-emphasis">Course files will appear here.</div></VCardText>
        </VWindowItem>
      </VWindow>

      <VDialog v-model="enrolUserDialog" max-width="520">
        <VCard rounded="xl">
          <VCardTitle class="pa-6 pb-2">Enrol user</VCardTitle>
          <VCardText class="pa-6 pt-2">
            <VAlert v-if="enrolUserError" class="mb-4" color="error" variant="tonal">{{ enrolUserError }}</VAlert>
            <VProgressLinear v-if="loadingLearners" class="mb-4" color="primary" indeterminate />
            <VSelect
              v-else-if="learnerOptions.length"
              v-model="selectedLearnerId"
              :items="learnerOptions"
              item-title="title"
              item-value="value"
              label="Learner"
              variant="outlined"
            />
            <div v-else-if="!enrolUserError" class="text-body-2 text-medium-emphasis">There are no eligible learners available to enrol.</div>
            <div v-if="!loadingLearners && trainerOptions.length" class="mt-3">
              <div class="d-flex align-center justify-space-between mb-1">
                <div class="text-subtitle-2">Assign trainers</div>
                <div class="text-caption text-medium-emphasis">{{ selectedTrainerIds.length }} selected</div>
              </div>
              <div class="trainer-choice-list">
                <VCheckbox
                  v-for="trainer in trainerOptions"
                  :key="trainer.value"
                  :model-value="selectedTrainerIds.includes(trainer.value)"
                  :label="trainer.title"
                  density="compact"
                  hide-details
                  @update:model-value="updateSelectedTrainer(trainer.value, $event)"
                />
              </div>
            </div>
          </VCardText>
          <VCardActions class="px-6 pb-6">
            <VSpacer />
            <VBtn variant="text" @click="enrolUserDialog = false">Cancel</VBtn>
            <VBtn color="primary" :disabled="loadingLearners || !selectedLearnerId" :loading="enrolmentsApi.actionLoading.create" @click="enrolUser">Enrol</VBtn>
          </VCardActions>
        </VCard>
      </VDialog>

      <VDialog v-model="trainerDialog" max-width="520">
        <VCard rounded="xl">
          <VCardTitle class="pa-6 pb-2">Assign trainers</VCardTitle>
          <VCardText class="pa-6 pt-2">
            <VAlert v-if="trainerEditError" class="mb-4" color="error" variant="tonal">{{ trainerEditError }}</VAlert>
            <VProgressLinear v-if="loadingTrainerForm" class="mb-4" color="primary" indeterminate />
            <div v-else-if="editingTrainerOptions.length">
              <div class="d-flex align-center justify-space-between mb-1">
                <div class="text-subtitle-2">Trainers</div>
                <div class="text-caption text-medium-emphasis">{{ editingTrainerIds.length }} selected</div>
              </div>
              <div class="trainer-choice-list">
                <VCheckbox
                  v-for="trainer in editingTrainerOptions"
                  :key="trainer.value"
                  :model-value="editingTrainerIds.includes(trainer.value)"
                  :label="trainer.title"
                  density="compact"
                  hide-details
                  @update:model-value="updateEditingTrainer(trainer.value, $event)"
                />
              </div>
            </div>
            <div v-else-if="!trainerEditError" class="text-body-2 text-medium-emphasis">No trainers are available to assign.</div>
          </VCardText>
          <VCardActions class="px-6 pb-6">
            <VSpacer />
            <VBtn variant="text" @click="trainerDialog = false">Cancel</VBtn>
            <VBtn color="primary" :disabled="loadingTrainerForm || !editingTrainerOptions.length || Boolean(trainerEditError)" :loading="savingTrainerAssignments" @click="saveTrainerAssignments">Save</VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
    </template>
  </VCard>
</template>

<style scoped>
.version-select { min-width: 180px; }
.trainer-choice-list { max-height: 240px; overflow-y: auto; }
</style>
