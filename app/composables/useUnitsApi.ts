import type { CourseResourceInput, CourseResourceItem } from '~/types/course-resources'
import type { ApiNewForm } from '~/types/api-form'

export function useUnitsApi() {
  const api = useApi()
  const collection = (courseId: string) => `/courses/${encodeURIComponent(courseId)}/units`

  return {
    editForm(courseId: string, id: string) {
      return api<{ vjsf: { schema: Record<string, unknown>; model: Partial<CourseResourceInput> } }>(`${collection(courseId)}/${encodeURIComponent(id)}/edit`)
    },
    newForm(courseId: string) {
      return api<{ vjsf: ApiNewForm<CourseResourceInput> }>(`${collection(courseId)}/new`)
    },
    list(courseId: string) {
      return api<{ items: CourseResourceItem[] }>(collection(courseId))
    },
    async save(courseId: string, data: CourseResourceInput, id?: string) {
      const path = collection(courseId)
      const response = await api<{ item: CourseResourceItem }>(id ? `${path}/update/${encodeURIComponent(id)}` : `${path}/create`, {
        method: id ? 'PUT' : 'POST', body: data,
      })
      return response.item
    },
    async updateStatus(courseId: string, id: string, status: string) {
      const response = await api<{ item: CourseResourceItem }>(`${collection(courseId)}/${encodeURIComponent(id)}/update_status`, {
        method: 'POST', body: { status },
      })
      return response.item
    },
  }
}
