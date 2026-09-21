import { defineStore } from 'pinia'

export type NotificationType = 'email' | 'sms' | 'notification'

export interface NotificationMessage {
  [key: string]: unknown
}

export interface NotificationInput {
  user_id: string
  type: NotificationType
  message: NotificationMessage
}
export interface Notification extends NotificationInput { id: string; created_at?: string; read?: number }

export const useNotificationsStore = defineStore('notifications', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const notifications = ref<Notification[]>([])

  async function search() {
    const api = useApi()
    notifications.value = await api<Notification[]>('/notifications/search', { method: 'POST', body: {} })
    return notifications.value
  }

  async function create(notification: NotificationInput) {
    loading.value = true
    error.value = null
    try {
      const api = useApi()
      return await api<Notification>('/notifications/create', { method: 'POST', body: notification })
    } catch (cause) {
      error.value = getApiErrorMessage(cause, 'Unable to create notification.')
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function update(id: string, notification: Partial<NotificationInput>) {
    const api = useApi()
    return api<Notification>(`/notifications/${id}`, { method: 'PUT', body: notification })
  }
  async function remove(id: string) {
    const api = useApi()
    await api(`/notifications/${id}`, { method: 'DELETE' })
    notifications.value = notifications.value.filter(item => item.id !== id)
  }

  return { notifications, loading, error, search, create, update, remove }
})
