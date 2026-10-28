import { defineStore } from 'pinia'
import type { ApiFormSchema } from '~/types/api-form'
import type { VersionMetadata } from '~/types/course-resources'

export interface Course {
  id: string
  title: string
  code: string
  package_id?: string
  type: string
  status: string
  published_version?: number
  versions?: VersionMetadata[]
  permissions?: Record<string, boolean>
  content?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface CoursePublishJob { job: { notification_id: string; status: string } }

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

  async function version(id: string, version: number) {
    const api = useApi()
    return api<Record<string, any>>(`/courses/${encodeURIComponent(id)}/versions/${version}`)
  }

  async function versionUnit(id: string, version: number, unitId: string) {
    const api = useApi()
    return api<{ course: Partial<Course>; version: number; unit: Record<string, any>; blocks: Record<string, any>[] }>(
      `/courses/${encodeURIComponent(id)}/versions/${version}/units/${encodeURIComponent(unitId)}`,
    )
  }

  async function editForm(id: string) {
    const api = useApi()
    return api<{ vjsf: { schema: Record<string, unknown>; model: Partial<Course> } }>(`/courses/${id}/edit`)
  }

  async function newForm() {
    const api = useApi()
    return api<{ vjsf: { schema: ApiFormSchema; model: Partial<Course> & { package_id: string } } }>('/courses/new')
  }

  async function create(course: Pick<Course, 'title' | 'code' | 'type'> & { package_id: string }) {
    const api = useApi()
    return api<Course>('/courses/create', {
      method: 'POST',
      body: { package_id: course.package_id, title: course.title, code: course.code, type: course.type, content: {} }
    })
  }

  async function changeStatus(id: string, status: string) {
    const api = useApi()
    const updated = await api<Course | CoursePublishJob>(`/courses/${id}/update_status`, { method: 'POST', body: { status } })
    if ('job' in updated) return updated
    const index = courses.value.findIndex(course => course.id === id)
    if (index !== -1) courses.value[index] = { ...courses.value[index], ...updated }
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

  return { courses, loading, error, search, show, version, versionUnit, editForm, newForm, create, update, changeStatus, remove }
})
