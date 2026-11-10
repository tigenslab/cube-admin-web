import { defineStore } from 'pinia'
import type { ApiNewForm } from '~/types/api-form'
import type { CourseResourceInput, CourseResourceItem } from '~/types/course-resources'
import { useApiActions } from '~/composables/useApiActions'

export const useUnitBlocksStore = defineStore('unit-blocks', () => {
  const { api, loading, error, request } = useApiActions('Unable to load blocks.')
  const collection = (courseId: string, unitId: string) => `/courses/${encodeURIComponent(courseId)}/units/${encodeURIComponent(unitId)}/blocks`

  function newForm(courseId: string, unitId: string) {
    return request(() => api<{ vjsf: ApiNewForm<CourseResourceInput> }>(`${collection(courseId, unitId)}/new`), 'Unable to load the block form.')
  }

  function index(courseId: string, unitId: string) {
    return request(() => api<{ items: CourseResourceItem[] }>(collection(courseId, unitId)))
  }

  async function create(courseId: string, unitId: string, data: CourseResourceInput) {
    const path = collection(courseId, unitId)
    const response = await request(() => api<{ item: CourseResourceItem }>(`${path}/create`, {
      method: 'POST', body: data,
    }), 'Unable to create the block.')
    return response.item
  }

  async function update(courseId: string, unitId: string, id: string, data: CourseResourceInput) {
    const path = collection(courseId, unitId)
    const response = await request(() => api<{ item: CourseResourceItem }>(`${path}/${encodeURIComponent(id)}`, {
      method: 'PUT', body: data,
    }), 'Unable to update the block.')
    return response.item
  }

  function save(courseId: string, unitId: string, data: CourseResourceInput, id?: string) {
    return id ? update(courseId, unitId, id, data) : create(courseId, unitId, data)
  }

  function destroy(courseId: string, unitId: string, id: string) {
    return request(() => api<{ delete_item: CourseResourceItem }>(`${collection(courseId, unitId)}/${encodeURIComponent(id)}`, { method: 'DELETE' }), 'Unable to remove the block.')
  }

  return { loading, error, newForm, new: newForm, index, list: index, create, update, save, destroy, remove: destroy }
})
