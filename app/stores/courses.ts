import { defineStore } from 'pinia'
import type { ApiFormSchema } from '~/types/api-form'
import type { VersionMetadata } from '~/types/course-resources'
import { useApiActions } from '~/composables/useApiActions'

export interface Course {
  id: string
  title: string
  code: string
  package_id?: string
  catalogue_course_id?: string
  type: string
  status: string
  level?: number
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
  const { api, loading, error, request } = useApiActions('The course request could not be completed.')

  async function search() {
    const data = await request(() => api<Course[]>('/courses', {
        method: 'POST',
        body: {}
      }), 'Unable to load courses.')
    courses.value = data
    return data
  }

  async function show(id: string) {
    return request(() => api<Course>(`/courses/${id}`), 'Unable to load the course.')
  }

  async function version(id: string, version: number) {
    return request(() => api<Record<string, any>>(`/courses/${encodeURIComponent(id)}/versions/${version}`), 'Unable to load the course version.')
  }

  async function versionUnit(id: string, version: number, unitId: string) {
    return request(() => api<{ course: Partial<Course>; version: number; unit: Record<string, any>; blocks: Record<string, any>[] }>(
      `/courses/${encodeURIComponent(id)}/versions/${version}/units/${encodeURIComponent(unitId)}`,
    ), 'Unable to load the course unit.')
  }

  async function editForm(id: string) {
    return request(() => api<{ vjsf: { schema: Record<string, unknown>; model: Partial<Course> } }>(`/courses/${id}/edit`), 'Unable to load the course form.')
  }

  async function newForm(packageId?: string) {
    return request(() => api<{ vjsf: { schema: ApiFormSchema; model: Partial<Course> & { package_id?: string; level?: number } } }>('/courses/new', {
      query: packageId ? { package_id: packageId } : undefined,
    }), 'Unable to load the course form.')
  }

  async function create(course: { title?: string; code?: string; package_id: string; level?: number }) {
    return request(() => api<Course>('/courses/create', {
      method: 'POST',
      body: { package_id: course.package_id, title: course.title, code: course.code, level: course.level, content: {} }
    }), 'Unable to create the course.')
  }

  async function changeStatus(id: string, status: string) {
    const updated = await request(() => api<Course | CoursePublishJob>(`/courses/${id}/update_status`, { method: 'POST', body: { status } }), 'Unable to change the course status.')
    if ('job' in updated) return updated
    const index = courses.value.findIndex(course => course.id === id)
    if (index !== -1) courses.value[index] = { ...courses.value[index], ...updated }
    return updated
  }

  async function update(id: string, course: Partial<Omit<Course, 'id'>>) {
    return request(() => api<Course>(`/courses/${id}`, { method: 'PUT', body: course }), 'Unable to update the course.')
  }

  async function remove(id: string) {
    await request(() => api(`/courses/${id}`, { method: 'DELETE' }), 'Unable to delete the course.')
    courses.value = courses.value.filter(course => course.id !== id)
  }

  return {
    courses, loading, error,
    index: search, search, show, version, versionUnit, edit: editForm, editForm, new: newForm, newForm,
    create, update, changeStatus, destroy: remove, remove,
  }
})
