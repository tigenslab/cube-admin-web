import type { CourseResourceInput, CourseResourceItem } from '~/types/course-resources'
import type { ApiNewForm } from '~/types/api-form'

export function useCourseUnitsApi() {
  const api = useApi()
  const collection = (courseId: string) => `/courses/${encodeURIComponent(courseId)}/course_units`

  return {
    newForm(courseId: string) {
      return api<{ vjsf: ApiNewForm<CourseResourceInput> }>(`${collection(courseId)}/new`)
    },
    editForm(courseId: string, id: string) {
      return api<{ vjsf: ApiNewForm<CourseResourceInput> }>(`${collection(courseId)}/edit/${encodeURIComponent(id)}`)
    },
    list(courseId: string) {
      return api<{ items: CourseResourceItem[]; units: CourseResourceItem[] }>(collection(courseId))
    },
    async save(courseId: string, data: CourseResourceInput, id?: string) {
      const path = collection(courseId)
      const response = await api<{ item: CourseResourceItem }>(id ? `${path}/update/${encodeURIComponent(id)}` : `${path}/create`, {
        method: id ? 'PUT' : 'POST', body: data,
      })
      return response.item
    },
    remove(courseId: string, id: string) {
      return api<{ delete_item: CourseResourceItem }>(`${collection(courseId)}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
  }
}
