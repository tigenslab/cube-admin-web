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
  status?: EnrolmentStatus
  course?: EnrolmentCourse | null
  learner?: EnrolmentPerson | null
  trainers?: EnrolmentPerson[]
  permissions?: Record<string, boolean>
  created_at?: string
}

export type EnrolmentStatus = 'new' | 'in_progress' | 'submitted' | 'marking_pending' | 'not_yet_competent' | 'not_competent' | 'draft_not_competent' | 'competent' | 'draft_competent' | 'max_attempts_exceeded'
export type EnrolmentActivityType = 'view_course' | 'view_unit' | 'view_block' | 'answered' | 'completed' | 'status_changed' | 'marked_component' | 'marked_unit'

export interface EnrolmentActivity {
  id: string
  enrolment_id: string
  user_id: string
  course_id: string
  unit_id?: string
  block_id?: string
  component_id?: string
  activity_type: EnrolmentActivityType
  activity_data?: Record<string, unknown>
  created_at: string
}

export interface EnrolmentForm {
  schema: ApiFormSchema
  model: {
    course_id?: string
    learner_id?: string
    trainer_ids: string[]
  }
}

function normalizeTrainerIds(value: unknown): string[] {
  const ids = Array.isArray(value) ? value : value == null || value === '' ? [] : [value]
  return [...new Set(ids.map(String).filter(Boolean))]
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
    const body = { ...data, trainer_ids: normalizeTrainerIds(data.trainer_ids) }
    return request(() => api<Enrolment>('/enrolments/create', { method: 'POST', body }), 'Unable to enrol the learner.', 'create')
  }

  async function updateTrainers(id: string, trainer_ids: string[]) {
    const body = { trainer_ids: normalizeTrainerIds(trainer_ids) }
    const updated = await request(() => api<Enrolment>(`/enrolments/edit/${id}`, { method: 'PATCH', body }), 'Unable to update trainers.', `update_${id}`)
    const index = enrolments.value.findIndex(item => item.id === id)
    if (index !== -1) enrolments.value[index] = { ...enrolments.value[index], ...updated }
    return updated
  }

  function activities(id: string, filters: Partial<Pick<EnrolmentActivity, 'user_id' | 'course_id' | 'unit_id' | 'block_id' | 'component_id' | 'activity_type'>> = {}) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) {
      if (value != null && value !== '') query.set(key, String(value))
    }
    const queryString = query.toString()
    return request(() => api<{ items: EnrolmentActivity[] }>(`/enrolments/${encodeURIComponent(id)}/activities${queryString ? `?${queryString}` : ''}`).then(result => result.items), 'Unable to load activity history.', `activities_${id}`)
  }

  function recordActivity(id: string, data: {
    activity_type: Extract<EnrolmentActivityType, 'view_course' | 'view_unit' | 'view_block' | 'answered' | 'completed'>
    unit_id?: string
    block_id?: string
    component_id?: string
    activity_data?: Record<string, unknown>
  }) {
    return request(() => api<{ item: EnrolmentActivity }>(`/enrolments/${encodeURIComponent(id)}/activities`, { method: 'POST', body: data }).then(result => result.item), 'Unable to save activity.', `activity_${id}`)
  }

  async function changeStatus(id: string, status: EnrolmentStatus) {
    const updated = await request(() => api<Enrolment>(`/enrolments/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } }), 'Unable to update enrolment status.', `status_${id}`)
    const index = enrolments.value.findIndex(item => item.id === id)
    if (index !== -1) enrolments.value[index] = { ...enrolments.value[index], ...updated }
    return updated
  }

  function markComponent(id: string, data: { unit_id: string; block_id: string; component_id: string; outcome: 'competent' | 'not_yet_competent' | 'not_competent'; draft: boolean; feedback?: string }) {
    return request(() => api(`/enrolments/${encodeURIComponent(id)}/mark-component`, { method: 'POST', body: data }), 'Unable to save component marking.', `mark_component_${id}`)
  }

  async function markUnit(id: string, data: { unit_id: string; outcome: 'competent' | 'not_yet_competent' | 'not_competent'; draft: boolean; feedback?: string }) {
    const result = await request(() => api<{ status: EnrolmentStatus }>(`/enrolments/${encodeURIComponent(id)}/mark-unit`, { method: 'POST', body: data }), 'Unable to save unit marking.', `mark_unit_${id}`)
    const index = enrolments.value.findIndex(item => item.id === id)
    if (index !== -1) enrolments.value[index] = { ...enrolments.value[index], status: result.status }
    return result
  }

  async function remove(id: string) {
    await request(() => api(`/enrolments/delete/${id}`, { method: 'DELETE' }), 'Unable to remove the enrolment.', `delete_${id}`)
    enrolments.value = enrolments.value.filter(item => item.id !== id)
  }

  return { enrolments, loading, actionLoading, error, search, newForm, editForm, create, updateTrainers, activities, recordActivity, changeStatus, markComponent, markUnit, remove }
})
