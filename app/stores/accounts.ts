import { defineStore } from 'pinia'

export interface Account {
  id: string | number
  name: string
  subdomain: string
  address_json?: Record<string, unknown>
  disabled?: number
  created_at?: string
}

export interface AccountEditForm {
  schema: Record<string, unknown>
  model: Partial<Account>
}

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])
  const currentAccount = ref<Account | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function request<T>(operation: () => Promise<T>) {
    loading.value = true
    error.value = null
    try { return await operation() } catch (cause) {
      error.value = getApiErrorMessage(cause, 'The request could not be completed.')
      throw cause
    } finally { loading.value = false }
  }

  async function index() {
    const data = await request(() => useApi()<Account[]>('/accounts', { method: 'POST', body: {} }))
    accounts.value = data
    return data
  }

  async function show(id: string | number) {
    const data = await request(() => useApi()<Account>(`/accounts/${id}`))
    currentAccount.value = data
    return data
  }

  async function editForm(id: string | number) {
    return request(() => useApi()<{ vjsf: AccountEditForm }>(`/accounts/${id}/edit`))
  }

  async function create(data: Partial<Account>) {
    const created = await request(() => useApi<Account>('/accounts/create', { method: 'POST', body: data }))
    accounts.value.push(created)
    return created
  }

  async function update(id: string | number, data: Partial<Account>) {
    const updated = await request(() => useApi<Account>(`/accounts/edit/${id}`, { method: 'PATCH', body: data }))
    const index = accounts.value.findIndex(account => account.id === id)
    if (index !== -1) accounts.value[index] = updated
    if (currentAccount.value?.id === id) currentAccount.value = updated
    return updated
  }

  return { accounts, currentAccount, loading, error, index, show, editForm, create, update }
})
