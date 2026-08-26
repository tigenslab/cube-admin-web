import { defineStore } from 'pinia'

export interface Course {
  id: string
  title: string
  code: string
  level: number
  type: string
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

  async function create(course: Pick<Course, 'title' | 'code' | 'level' | 'type'>) {
    const api = useApi()
    return api<Course>('/courses/create', {
      method: 'POST',
      body: { title: course.title, code: course.code, level: course.level, type: course.type, content: {} }
    })
  }

  return { courses, loading, error, search, create }
})
