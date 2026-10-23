import type { CourseResourceItem, UnitBlockComponent } from '~/types/course-resources'

export function useUnitBlockComponentsApi() {
  const api = useApi()
  const collection = (courseId: string, unitId: string, blockId: string) =>
    `/courses/${encodeURIComponent(courseId)}/units/${encodeURIComponent(unitId)}/blocks/${encodeURIComponent(blockId)}/components`

  return {
    list(courseId: string, unitId: string, blockId: string) {
      return api<{ items: UnitBlockComponent[] }>(collection(courseId, unitId, blockId))
    },
    save(courseId: string, unitId: string, blockId: string, data: Partial<Pick<UnitBlockComponent, 'type' | 'content'>>, id?: string) {
      const path = collection(courseId, unitId, blockId)
      return api<{ item: UnitBlockComponent }>(id ? `${path}/${encodeURIComponent(id)}` : `${path}/create`, {
        method: id ? 'PUT' : 'POST', body: data,
      })
    },
    remove(courseId: string, unitId: string, blockId: string, id: string) {
      return api<{ delete_item: UnitBlockComponent }>(`${collection(courseId, unitId, blockId)}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
    reorder(courseId: string, unitId: string, blockId: string, componentIds: string[]) {
      return api<{ item: CourseResourceItem }>(`${collection(courseId, unitId, blockId)}/reorder`, {
        method: 'PUT', body: { component_ids: componentIds },
      })
    },
  }
}
