import { defineStore } from 'pinia'
import type { ApiFormSchema } from '~/types/api-form'
import { useApiActions } from '~/composables/useApiActions'

export interface EnrolmentPerson {
  id: string
  first_name?: string
  last_name?: string
  username?: string
  email?: string
}

export interface EnrolmentCourse {
  id: string
  code?: string
  title?: string
  level?: number
}

export interface Enrolment {
  id: string
  account_id: string
  course_id: string
  learner_id: string
  trainer_ids: string[]
  course?: EnrolmentCourse | null
  learner?: EnrolmentPerson | null
  trainers?: EnrolmentPerson[]
  permissions?: Record<string, boolean>
  created_at?: string
}

export interface EnrolmentForm {
  schema: ApiFormSchema
  model: {
    course_id?: string
    learner_id?: string
    trainer_ids: string[]
  }
}

export const useEnrolmentsStore = defineStore('enrolments', () => {
  const enrolments = ref<Enrolment[]>([])
  const { api, loading, actionLoading, error, request } = useApiActions('The enrolment request could not be completed.')

  async function search() {
    enrolments.value = await request(() => api<Enrolment[]>('/enrolments', { method: 'POST', body: {} }), 'Unable to load enrolments.')
    return enrolments.value
  }

  async function newForm() {
    return request(() => api<{ vjsf: EnrolmentForm }>('/enrolments/new'), 'Unable to load the enrolment form.', 'new')
  }

  async function editForm(id: string) {
    return request(() => api<{ vjsf: EnrolmentForm }>(`/enrolments/${id}/edit`), 'Unable to load trainer assignments.', `edit_${id}`)
  }

  async function create(data: Pick<Enrolment, 'course_id' | 'learner_id' | 'trainer_ids'>) {
    return request(() => api<Enrolment>('/enrolments/create', { method: 'POST', body: data }), 'Unable to enrol the learner.', 'create')
  }

  async function updateTrainers(id: string, trainer_ids: string[]) {
    const updated = await request(() => api<Enrolment>(`/enrolments/edit/${id}`, { method: 'PATCH', body: { trainer_ids } }), 'Unable to update trainers.', `update_${id}`)
    const index = enrolments.value.findIndex(item => item.id === id)
    if (index !== -1) enrolments.value[index] = { ...enrolments.value[index], ...updated }
    return updated
  }

  async function remove(id: string) {
    await request(() => api(`/enrolments/delete/${id}`, { method: 'DELETE' }), 'Unable to remove the enrolment.', `delete_${id}`)
    enrolments.value = enrolments.value.filter(item => item.id !== id)
  }

  return { enrolments, loading, actionLoading, error, search, newForm, editForm, create, updateTrainers, remove }
})
