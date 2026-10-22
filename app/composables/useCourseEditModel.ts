import type { Course } from '~/stores/courses'

interface CourseEditForm {
  schema: Record<string, unknown>
  model: Partial<Course>
}

export function useCourseEditModel() {
  const coursesStore = useCoursesStore()
  const { courses } = storeToRefs(coursesStore)
  const courseId = ref('')
  const courseTitle = ref('')
  const form = ref<CourseEditForm | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')

  async function load(course: Pick<Course, 'id' | 'title'>) {
    courseId.value = course.id
    courseTitle.value = course.title
    form.value = null
    error.value = ''
    loading.value = true
    try {
      form.value = (await coursesStore.editForm(course.id)).vjsf
      return true
    } catch (cause) {
      error.value = getApiErrorMessage(cause, 'Unable to load course details.')
      return false
    } finally {
      loading.value = false
    }
  }

  async function save() {
    if (!form.value || !courseId.value) return null
    saving.value = true
    error.value = ''
    try {
      const updated = await coursesStore.update(courseId.value, form.value.model)
      const index = courses.value.findIndex(course => course.id === updated.id)
      if (index !== -1) courses.value[index] = { ...courses.value[index], ...updated }
      return updated
    } catch (cause) {
      error.value = getApiErrorMessage(cause, 'Unable to update course.')
      return null
    } finally {
      saving.value = false
    }
  }

  function reset() {
    courseId.value = ''
    courseTitle.value = ''
    form.value = null
    error.value = ''
  }

  return { courseId, courseTitle, form, loading, saving, error, load, save, reset }
}
