import { defineStore } from 'pinia'

export interface Course {
  id: string
  title: string
  code: string
  content?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export const useCoursesStore = defineStore('courses', () => {
  const courses = ref<Course[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function search() {
    loading.value = true
    error.value = null

    try {
      const api = useApi()
      const data = await api<Course[]>('/courses/search', {
        method: 'POST',
        body: {}
      })

      courses.value = data
      return data
    } catch (cause) {
      error.value = getApiErrorMessage(cause, 'Unable to load courses.')
      throw cause
    } finally {
      loading.value = false
    }
  }

  return { courses, loading, error, search }
})
