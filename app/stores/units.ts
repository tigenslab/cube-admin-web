import { defineStore } from 'pinia'
import type { ApiNewForm } from '~/types/api-form'
import type { CourseResourceInput, CourseResourceItem } from '~/types/course-resources'
import { useApiActions } from '~/composables/useApiActions'

export const useUnitsStore = defineStore('units', () => {
  const { api, loading, error, request } = useApiActions('Unable to load units.')
  const collection = (courseId: string) => `/courses/${encodeURIComponent(courseId)}/units`

  function editForm(courseId: string, id: string) {
    return request(() => api<{ vjsf: { schema: Record<string, unknown>; model: Partial<CourseResourceInput> } }>(`${collection(courseId)}/${encodeURIComponent(id)}/edit`), 'Unable to load the unit form.')
  }

  function newForm(courseId: string) {
    return request(() => api<{ vjsf: ApiNewForm<CourseResourceInput> }>(`${collection(courseId)}/new`), 'Unable to load the unit form.')
  }

  function index(courseId: string) {
    return request(() => api<{ items: CourseResourceItem[] }>(collection(courseId)))
  }

  async function create(courseId: string, data: CourseResourceInput) {
    if (!data.package_id) throw new Error('A package_id is required to create a unit.')
    const path = collection(courseId)
    const response = await request(() => api<{ item: CourseResourceItem }>(`${path}/create`, {
      method: 'POST', body: data,
    }), 'Unable to create the unit.')
    return response.item
  }

  async function update(courseId: string, id: string, data: CourseResourceInput) {
    const path = collection(courseId)
    const response = await request(() => api<{ item: CourseResourceItem }>(`${path}/update/${encodeURIComponent(id)}`, {
      method: 'PUT', body: data,
    }), 'Unable to update the unit.')
    return response.item
  }

  function save(courseId: string, data: CourseResourceInput, id?: string) {
    return id ? update(courseId, id, data) : create(courseId, data)
  }

  return { loading, error, editForm, edit: editForm, newForm, new: newForm, index, list: index, create, update, save }
})
