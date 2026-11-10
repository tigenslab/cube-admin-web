import { defineStore } from 'pinia'
import type { ApiNewForm } from '~/types/api-form'
import type { CourseResourceItem, UnitBlockComponent } from '~/types/course-resources'
import { useApiActions } from '~/composables/useApiActions'

export const useUnitBlockComponentsStore = defineStore('unit-block-components', () => {
  const { api, loading, error, request } = useApiActions('Unable to load block components.')
  const collection = (courseId: string, unitId: string, blockId: string) =>
    `/courses/${encodeURIComponent(courseId)}/units/${encodeURIComponent(unitId)}/blocks/${encodeURIComponent(blockId)}/components`

  function newForm(courseId: string, unitId: string, blockId: string) {
    return request(() => api<{ vjsf: ApiNewForm<Partial<Pick<UnitBlockComponent, 'type' | 'content'>>> }>(`${collection(courseId, unitId, blockId)}/new`), 'Unable to load the component form.')
  }

  function index(courseId: string, unitId: string, blockId: string) {
    return request(() => api<{ items: UnitBlockComponent[] }>(collection(courseId, unitId, blockId)))
  }

  function create(courseId: string, unitId: string, blockId: string, data: Partial<Pick<UnitBlockComponent, 'type' | 'content'>>) {
    const path = collection(courseId, unitId, blockId)
    return request(() => api<{ item: UnitBlockComponent }>(`${path}/create`, {
      method: 'POST', body: data,
    }), 'Unable to create the component.')
  }

  function update(courseId: string, unitId: string, blockId: string, id: string, data: Partial<Pick<UnitBlockComponent, 'type' | 'content'>>) {
    const path = collection(courseId, unitId, blockId)
    return request(() => api<{ item: UnitBlockComponent }>(`${path}/${encodeURIComponent(id)}`, {
      method: 'PUT', body: data,
    }), 'Unable to update the component.')
  }

  function save(courseId: string, unitId: string, blockId: string, data: Partial<Pick<UnitBlockComponent, 'type' | 'content'>>, id?: string) {
    return id ? update(courseId, unitId, blockId, id, data) : create(courseId, unitId, blockId, data)
  }

  function destroy(courseId: string, unitId: string, blockId: string, id: string) {
    return request(() => api<{ delete_item: UnitBlockComponent }>(`${collection(courseId, unitId, blockId)}/${encodeURIComponent(id)}`, { method: 'DELETE' }), 'Unable to remove the component.')
  }

  function reorder(courseId: string, unitId: string, blockId: string, componentIds: string[]) {
    return request(() => api<{ item: CourseResourceItem }>(`${collection(courseId, unitId, blockId)}/reorder`, {
      method: 'PUT', body: { component_ids: componentIds },
    }), 'Unable to reorder block components.')
  }

  return { loading, error, newForm, new: newForm, index, list: index, create, update, save, destroy, remove: destroy, reorder }
})
