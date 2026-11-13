import { defineStore } from 'pinia'
import type { ApiFormSchema } from '~/types/api-form'
import { useApiActions } from '~/composables/useApiActions'

export type GroupType = 'user' | 'course'

export interface GroupInput {
  title: string
  description: string
  type: GroupType
  group_items: string[]
}

export interface Group extends GroupInput {
  id: string
  account_id: string
  created_at?: string
  updated_at?: string
  permissions?: Record<string, boolean>
}

export interface GroupForm {
  schema: ApiFormSchema
  model: GroupInput
}

export const useGroupsStore = defineStore('groups', () => {
  const groups = ref<Group[]>([])
  const { api, loading, actionLoading, error, request } = useApiActions('The group request could not be completed.')

  async function search(filters: { type?: GroupType; query?: string } = {}) {
    const response = await request(() => api<{ items: Group[] }>('/groups', {
      method: 'POST',
      body: filters,
    }), 'Unable to load groups.')
    groups.value = response.items
    return groups.value
  }

  async function show(id: string) {
    const response = await request(() => api<{ item: Group }>(`/groups/${encodeURIComponent(id)}`), 'Unable to load the group.')
    return response.item
  }

  async function newForm() {
    return request(() => api<{ vjsf: GroupForm }>('/groups/new'), 'Unable to load the group form.', 'new')
  }

  async function editForm(id: string) {
    return request(() => api<{ vjsf: GroupForm }>(`/groups/${encodeURIComponent(id)}/edit`), 'Unable to load the group form.', `edit_${id}`)
  }

  async function create(data: GroupInput) {
    const response = await request(() => api<{ item: Group }>('/groups/create', {
      method: 'POST',
      body: data,
    }), 'Unable to create the group.', 'create')
    groups.value.unshift(response.item)
    return response.item
  }

  async function update(id: string, data: GroupInput) {
    const response = await request(() => api<{ item: Group }>(`/groups/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: data,
    }), 'Unable to update the group.', `update_${id}`)
    const index = groups.value.findIndex(group => group.id === id)
    if (index !== -1) groups.value[index] = response.item
    return response.item
  }

  async function remove(id: string) {
    await request(() => api(`/groups/${encodeURIComponent(id)}`, { method: 'DELETE' }), 'Unable to delete the group.', `delete_${id}`)
    groups.value = groups.value.filter(group => group.id !== id)
  }

  return { groups, loading, actionLoading, error, search, show, newForm, editForm, create, update, remove }
})
