export type CourseContentKind = 'course_units' | 'units' | 'unit_blocks'

export interface CourseContentItem {
  id: string
  type: string
  course_id?: string
  unit_id?: string
  code?: string
  title?: string
  status?: string
  ancestry?: string
  position?: number
  linked_block_id?: string | null
  component_ids?: string[]
  content?: Record<string, unknown>
  metadata?: Record<string, unknown>
  settings?: Record<string, unknown>
  merged_content?: Record<string, unknown>
  permissions?: Record<string, boolean>
}

export type CourseContentInput = Partial<Pick<CourseContentItem,
  'type' | 'unit_id' | 'code' | 'title' | 'status' | 'ancestry' | 'position' | 'linked_block_id' | 'content'
>>

export function useCourseContentApi() {
  const api = useApi()
  const segment = (value: string) => encodeURIComponent(value)
  function collection(courseId: string, kind: CourseContentKind, unitId?: string) {
    const course = `/courses/${segment(courseId)}`
    if (kind !== 'unit_blocks') return `${course}/${kind}`
    if (!unitId) throw new Error('Select a unit first.')
    return `${course}/units/${segment(unitId)}/unit_blocks`
  }
  return {
    list(courseId: string, kind: CourseContentKind, unitId?: string) {
      return api<{ items: CourseContentItem[]; units?: CourseContentItem[] }>(collection(courseId, kind, unitId))
    },
    async save(courseId: string, kind: CourseContentKind, data: CourseContentInput, id?: string, unitId?: string) {
      const path = collection(courseId, kind, unitId)
      const response = await api<{ item: CourseContentItem }>(id ? `${path}/${segment(id)}` : path, {
        method: id ? 'PUT' : 'POST', body: data,
      })
      return response.item
    },
    remove(courseId: string, kind: CourseContentKind, id: string, unitId?: string) {
      return api<{ delete_item: CourseContentItem }>(`${collection(courseId, kind, unitId)}/${segment(id)}`, { method: 'DELETE' })
    },
  }
}
