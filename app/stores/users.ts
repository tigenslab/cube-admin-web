import { defineStore } from 'pinia'
import type { ApiFormSchema } from '~/types/api-form'
import { useApiActions } from '~/composables/useApiActions'

export interface User {
  id: string | number
  name?: string
  email?: string
  username?: string
  first_name?: string
  last_name?: string
  role?: string
  roles?: string[]
  user_type?: string
  team?: string
  status?: string
  is_active?: boolean
  enabled?: boolean
  last_active?: string
  updated_at?: string
  phone?: string
  website?: string
  permissions?: Record<string, boolean>
}

export type CreateUserInput = Omit<User, 'id'>
export type UpdateUserInput = Partial<CreateUserInput>
export interface UserEditForm {
  schema: ApiFormSchema
  model: UpdateUserInput
}
export interface UserCreateForm {
  schema: ApiFormSchema
  model: CreateUserInput & { password?: string }
}

export const useUsersStore = defineStore('users', () => {
  const users = ref<User[]>([])
  const currentUser = ref<User | null>(null)
  const { api, loading, actionLoading, error, request } = useApiActions('The user request could not be completed.')

  async function index() {
    const data = await request(() => api<User[]>('/users', {
      method: 'POST',
      body: {}
    }), 'Unable to load users.')
    users.value = data
    return data
  }

  async function show(id: string | number) {
    const data = await request(async () => {
      const results = await api<User[]>('/users', { method: 'POST', body: { filters: { id } } })
      if (!results[0]) throw new Error('User does not exist.')
      return results[0]
    }, 'Unable to load the user.')
    currentUser.value = data
    return data
  }

  async function editForm(id: string | number) {
    return request(() => api<{ vjsf: UserEditForm }>(`/users/${id}/edit`), 'Unable to load the user form.', `edit_${id}`)
  }

  async function newForm() {
    return request(() => api<{ vjsf: UserCreateForm }>('/users/new'), 'Unable to load the user form.', 'new')
  }

  async function create(data: CreateUserInput) {
    const createdUser = await request(() => api<User>('/users/create', {
      method: 'POST',
      body: data
    }), 'Unable to create the user.', 'create')
    users.value.push(createdUser)
    return createdUser
  }

  async function update(id: string | number, data: UpdateUserInput) {
    const updatedUser = await request(() => api<User>(`/users/edit/${id}`, {
      method: 'PATCH',
      body: data
    }), 'Unable to update the user.', `update_${id}`)
    const index = users.value.findIndex((user) => user.id === id)

    if (index !== -1) users.value[index] = updatedUser
    if (currentUser.value?.id === id) currentUser.value = updatedUser

    return updatedUser
  }

  async function destroy(id: string | number) {
    await request(() => api<void>(`/users/delete/${id}`, { method: 'DELETE' }), 'Unable to delete the user.', `destroy_${id}`)
    users.value = users.value.filter((user) => user.id !== id)

    if (currentUser.value?.id === id) currentUser.value = null
  }

  return {
    users,
    currentUser,
    loading,
    actionLoading,
    error,
    index,
    show,
    new: newForm,
    editForm,
    edit: editForm,
    newForm,
    create,
    update,
    destroy
  }
})
