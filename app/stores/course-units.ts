import { defineStore } from 'pinia'
import type { ApiNewForm } from '~/types/api-form'
import type { CourseResourceInput, CourseResourceItem } from '~/types/course-resources'
import { useApiActions } from '~/composables/useApiActions'

export const useCourseUnitsStore = defineStore('course-units', () => {
  const { api, loading, error, request } = useApiActions('Unable to load course units.')
  const collection = (courseId: string) => `/courses/${encodeURIComponent(courseId)}/course_units`

  function newForm(courseId: string) {
    return request(() => api<{ vjsf: ApiNewForm<CourseResourceInput> }>(`${collection(courseId)}/new`), 'Unable to load the course unit form.')
  }

  function editForm(courseId: string, id: string) {
    return request(() => api<{ vjsf: ApiNewForm<CourseResourceInput> }>(`${collection(courseId)}/edit/${encodeURIComponent(id)}`), 'Unable to load the course unit form.')
  }

  function index(courseId: string) {
    return request(() => api<{ items: CourseResourceItem[]; units: CourseResourceItem[] }>(collection(courseId)))
  }

  async function create(courseId: string, data: CourseResourceInput) {
    if (!data.package_id) throw new Error('A package_id is required to create a course unit.')
    const path = collection(courseId)
    const response = await request(() => api<{ item: CourseResourceItem }>(`${path}/create`, {
      method: 'POST', body: data,
    }), 'Unable to create the course unit.')
    return response.item
  }

  async function update(courseId: string, id: string, data: CourseResourceInput) {
    const path = collection(courseId)
    const response = await request(() => api<{ item: CourseResourceItem }>(`${path}/update/${encodeURIComponent(id)}`, {
      method: 'PUT', body: data,
    }), 'Unable to update the course unit.')
    return response.item
  }

  function save(courseId: string, data: CourseResourceInput, id?: string) {
    return id ? update(courseId, id, data) : create(courseId, data)
  }

  function destroy(courseId: string, id: string) {
    return request(() => api<{ delete_item: CourseResourceItem }>(`${collection(courseId)}/${encodeURIComponent(id)}`, { method: 'DELETE' }), 'Unable to remove the course unit.')
  }

  return { loading, error, newForm, new: newForm, editForm, edit: editForm, index, list: index, create, update, save, destroy, remove: destroy }
})
