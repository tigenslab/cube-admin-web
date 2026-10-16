import type { CourseResourceInput, CourseResourceItem } from '~/types/course-resources'

export function useCourseUnitsApi() {
  const api = useApi()
  const collection = (courseId: string) => `/courses/${encodeURIComponent(courseId)}/course_units`

  return {
    list(courseId: string) {
      return api<{ items: CourseResourceItem[]; units: CourseResourceItem[] }>(collection(courseId))
    },
    async save(courseId: string, data: CourseResourceInput, id?: string) {
      const path = collection(courseId)
      const response = await api<{ item: CourseResourceItem }>(id ? `${path}/${encodeURIComponent(id)}` : path, {
        method: id ? 'PUT' : 'POST', body: data,
      })
      return response.item
    },
    remove(courseId: string, id: string) {
      return api<{ delete_item: CourseResourceItem }>(`${collection(courseId)}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
  }
}
