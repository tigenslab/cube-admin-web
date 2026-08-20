import { defineStore } from 'pinia'

export interface User {
  id: string | number
  name?: string
  email?: string
  username?: string
  first_name?: string
  last_name?: string
  role?: string
  user_type?: string
  team?: string
  status?: string
  is_active?: boolean
  enabled?: boolean
  last_active?: string
  updated_at?: string
  phone?: string
  website?: string
}

export type CreateUserInput = Omit<User, 'id'>
export type UpdateUserInput = Partial<CreateUserInput>

export const useUsersStore = defineStore('users', () => {
  const users = ref<User[]>([])
  const currentUser = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function request<T>(operation: () => Promise<T>) {
    loading.value = true
    error.value = null

    try {
      return await operation()
    } catch (cause) {
      error.value = getApiErrorMessage(cause, 'The request could not be completed.')
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function index() {
    const api = useApi()
    const data = await request(() => api<User[]>('/users/search', {
      method: 'POST',
      body: {}
    }))
    users.value = data
    return data
  }

  async function show(id: string | number) {
    const api = useApi()
    const data = await request(() => api<User>(`/users/${id}`))
    currentUser.value = data
    return data
  }

  async function create(data: CreateUserInput) {
    const api = useApi()
    const createdUser = await request(() => api<User>('/users', {
      method: 'POST',
      body: data
    }))
    users.value.push(createdUser)
    return createdUser
  }

  async function update(id: string | number, data: UpdateUserInput) {
    const api = useApi()
    const updatedUser = await request(() => api<User>(`/users/${id}`, {
      method: 'PATCH',
      body: data
    }))
    const index = users.value.findIndex((user) => user.id === id)

    if (index !== -1) users.value[index] = updatedUser
    if (currentUser.value?.id === id) currentUser.value = updatedUser

    return updatedUser
  }

  async function destroy(id: string | number) {
    const api = useApi()
    await request(() => api<void>(`/users/${id}`, { method: 'DELETE' }))
    users.value = users.value.filter((user) => user.id !== id)

    if (currentUser.value?.id === id) currentUser.value = null
  }

  return {
    users,
    currentUser,
    loading,
    error,
    index,
    show,
    create,
    update,
    destroy
  }
})
