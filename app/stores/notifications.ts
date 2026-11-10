import { defineStore } from 'pinia'
import type { ApiFormSchema } from '~/types/api-form'
import { useApiActions } from '~/composables/useApiActions'

export type NotificationType = 'EML' | 'SMS' | 'NTF'
export type NotificationAction = 'mailer' | 'delete' | 'import' | 'clone' | 'export' | 'course_publish'

export interface NotificationMessage {
  [key: string]: unknown
}

export interface NotificationInput {
  user_id: string
  type: NotificationType
  action?: NotificationAction
  message: NotificationMessage
}
export interface Notification extends NotificationInput { id: string; status?: string; created_at?: string; read?: number }

export interface NotificationCreateForm {
  schema: ApiFormSchema
  model: {
    user_id: string
    type: NotificationType
    message: string
  }
}

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const { api, loading, error, request } = useApiActions('The notification request could not be completed.')

  async function search() {
    notifications.value = await request(() => api<Notification[]>('/notifications', { method: 'POST', body: {} }), 'Unable to load notifications.')
    return notifications.value
  }

  async function createForm() {
    return request(() => api<{ vjsf: NotificationCreateForm }>('/notifications/new'), 'Unable to load the notification form.')
  }

  async function create(notification: NotificationInput) {
    const created = await request(() => api<Notification>('/notifications/create', { method: 'POST', body: notification }), 'Unable to create the notification.')
    notifications.value.unshift(created)
    return created
  }

  async function update(id: string, notification: Partial<NotificationInput>) {
    const updated = await request(() => api<Notification>(`/notifications/${id}`, { method: 'PUT', body: notification }), 'Unable to update the notification.')
    const index = notifications.value.findIndex(item => item.id === id)
    if (index !== -1) notifications.value[index] = updated
    return updated
  }

  async function remove(id: string) {
    await request(() => api(`/notifications/${id}`, { method: 'DELETE' }), 'Unable to delete the notification.')
    notifications.value = notifications.value.filter(item => item.id !== id)
  }

  return { notifications, loading, error, index: search, search, new: createForm, createForm, create, update, destroy: remove, remove }
})
