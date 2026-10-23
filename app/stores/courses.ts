import { defineStore } from 'pinia'
import type { ApiFormSchema } from '~/types/api-form'

export interface Course {
  id: string
  title: string
  code: string
  package_id?: string
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

  async function show(id: string) {
    const api = useApi()
    return api<Course>(`/courses/${id}`)
  }

  async function editForm(id: string) {
    const api = useApi()
    return api<{ vjsf: { schema: Record<string, unknown>; model: Partial<Course> } }>(`/courses/${id}/edit`)
  }

  async function newForm() {
    const api = useApi()
    return api<{ vjsf: { schema: ApiFormSchema; model: Partial<Course> & { package_id: string } } }>('/courses/new')
  }

  async function create(course: Pick<Course, 'title' | 'code' | 'sub_type' | 'type'> & { package_id: string } & Partial<Pick<Course, 'status'>>) {
    const api = useApi()
    return api<Course>('/courses/create', {
      method: 'POST',
      body: { package_id: course.package_id, title: course.title, code: course.code, sub_type: course.sub_type, type: course.type, status: course.status ?? 'new', content: {} }
    })
  }

  async function changeStatus(id: string, status: string) {
    const api = useApi()
    const updated = await api<Course>(`/courses/${id}/update_status`, { method: 'POST', body: { status } })
    const index = courses.value.findIndex(course => course.id === id)
    if (index !== -1) courses.value[index] = updated
    return updated
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

  return { courses, loading, error, search, show, editForm, newForm, create, update, changeStatus, remove }
})
