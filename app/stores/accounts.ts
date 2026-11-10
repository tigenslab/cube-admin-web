import { defineStore } from 'pinia'
import type { ApiFormSchema } from '~/types/api-form'
import type { PackageType } from '~/stores/packages'
import { useApiActions } from '~/composables/useApiActions'

export interface Account {
  id: string | number
  name: string
  subdomain: string
  address_json?: Record<string, unknown>
  disabled?: number
  course_types?: PackageType[]
  created_at?: string
}

export interface AccountEditForm {
  schema: ApiFormSchema
  model: Partial<Account>
}

export type AccountCreateForm = AccountEditForm

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])
  const currentAccount = ref<Account | null>(null)
  const { api, loading, error, request } = useApiActions('The account request could not be completed.')

  async function index() {
    const data = await request(() => api<Account[]>('/accounts', { method: 'POST', body: {} }), 'Unable to load accounts.')
    accounts.value = data
    return data
  }

  async function show(id: string | number) {
    const data = await request(() => api<Account>(`/accounts/${id}`), 'Unable to load the account.')
    currentAccount.value = data
    return data
  }

  async function editForm(id: string | number) {
    return request(() => api<{ vjsf: AccountEditForm }>(`/accounts/${id}/edit`), 'Unable to load the account form.')
  }

  async function newForm() {
    return request(() => api<{ vjsf: AccountCreateForm }>('/accounts/new'), 'Unable to load the account form.')
  }

  async function create(data: Partial<Account>) {
    const created = await request(() => api<Account>('/accounts/create', { method: 'POST', body: data }), 'Unable to create the account.')
    accounts.value.push(created)
    return created
  }

  async function update(id: string | number, data: Partial<Account>) {
    const updated = await request(() => api<Account>(`/accounts/${id}`, { method: 'PUT', body: data }), 'Unable to update the account.')
    const index = accounts.value.findIndex(account => account.id === id)
    if (index !== -1) accounts.value[index] = updated
    if (currentAccount.value?.id === id) currentAccount.value = updated
    return updated
  }

  async function destroy(id: string | number) {
    await request(() => api<void>(`/accounts/${id}`, { method: 'DELETE' }), 'Unable to delete the account.')
    accounts.value = accounts.value.filter(account => account.id !== id)
    if (currentAccount.value?.id === id) currentAccount.value = null
  }

  return { accounts, currentAccount, loading, error, index, show, new: newForm, newForm, edit: editForm, editForm, create, update, destroy }
})
