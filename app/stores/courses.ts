import { defineStore } from 'pinia'

export interface Course {
  id: string
  title: string
  code: string
  sub_type: string
  type: string
  status: string
  permissions?: Record<string, boolean>
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
      const data = await api<Course[]>('/courses', {
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

  async function create(course: Pick<Course, 'title' | 'code' | 'sub_type' | 'type'> & Partial<Pick<Course, 'status'>>) {
    const api = useApi()
    return api<Course>('/courses/create', {
      method: 'POST',
      body: { title: course.title, code: course.code, sub_type: course.sub_type, type: course.type, status: course.status ?? 'new', content: {} }
    })
  }

  async function update(id: string, course: Partial<Omit<Course, 'id'>>) {
    const api = useApi()
    return api<Course>(`/courses/${id}`, { method: 'PUT', body: course })
  }

  async function remove(id: string) {
    const api = useApi()
    await api(`/courses/${id}`, { method: 'DELETE' })
    courses.value = courses.value.filter(course => course.id !== id)
  }

  return { courses, loading, error, search, create, update, remove }
})
