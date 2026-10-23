import type { CourseResourceInput, CourseResourceItem } from '~/types/course-resources'
import type { ApiNewForm } from '~/types/api-form'

export function useUnitBlocksApi() {
  const api = useApi()
  const collection = (courseId: string, unitId: string) => `/courses/${encodeURIComponent(courseId)}/units/${encodeURIComponent(unitId)}/blocks`

  return {
    newForm(courseId: string, unitId: string) {
      return api<{ vjsf: ApiNewForm<CourseResourceInput> }>(`${collection(courseId, unitId)}/new`)
    },
    list(courseId: string, unitId: string) {
      return api<{ items: CourseResourceItem[] }>(collection(courseId, unitId))
    },
    async save(courseId: string, unitId: string, data: CourseResourceInput, id?: string) {
      const path = collection(courseId, unitId)
      const response = await api<{ item: CourseResourceItem }>(id ? `${path}/${encodeURIComponent(id)}` : `${path}/create`, {
        method: id ? 'PUT' : 'POST', body: data,
      })
      return response.item
    },
    remove(courseId: string, unitId: string, id: string) {
      return api<{ delete_item: CourseResourceItem }>(`${collection(courseId, unitId)}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
  }
}
