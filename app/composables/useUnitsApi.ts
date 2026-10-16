import type { CourseResourceInput, CourseResourceItem } from '~/types/course-resources'

export function useUnitsApi() {
  const api = useApi()
  const collection = (courseId: string) => `/courses/${encodeURIComponent(courseId)}/units`

  return {
    list(courseId: string) {
      return api<{ items: CourseResourceItem[] }>(collection(courseId))
    },
    async save(courseId: string, data: CourseResourceInput, id?: string) {
      const path = collection(courseId)
      const response = await api<{ item: CourseResourceItem }>(id ? `${path}/${encodeURIComponent(id)}` : path, {
        method: id ? 'PUT' : 'POST', body: data,
      })
      return response.item
    },
  }
}
