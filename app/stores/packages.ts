import { defineStore } from 'pinia'
import type { ApiNewForm } from '~/types/api-form'
import type { VersionMetadata } from '~/types/course-resources'
import { useApiActions } from '~/composables/useApiActions'

export type PackageType = 'SCH:V9' | 'RTO:NRT' | 'RTO:NAT'

export interface CoursePackage {
  id: string
  account_id: string
  type: PackageType
  code: string
  title: string
  description?: string
  status?: string
}

export interface PackageCourse {
  id: string
  title: string
  code: string
  type: PackageType
  level?: number
  status?: string
  permissions?: Record<string, boolean>
}

export interface PackageUnit {
  id: string
  code: string
  title: string
  metadata?: Record<string, unknown>
  content?: Record<string, unknown>
  versions?: VersionMetadata[]
}

export interface PackageDetail {
  item: CoursePackage
  courses: PackageCourse[]
  units: PackageUnit[]
  permissions: { create_course: boolean; create_unit: boolean }
}

export type PackageUnitForm = ApiNewForm<Partial<Pick<PackageUnit, 'code' | 'title' | 'metadata' | 'content'>> & { package_id: string }>

export const usePackagesStore = defineStore('packages', () => {
  const { api, loading, error, request } = useApiActions('Unable to load packages.')

  function index(type?: PackageType) {
    return request(() => api<{ items: CoursePackage[] }>('/packages', {
      query: type ? { type } : undefined,
    }))
  }

  function show(id: string) {
    return request(() => api<PackageDetail>(`/packages/${encodeURIComponent(id)}`), 'Unable to load package details.')
  }

  function newUnitForm(id: string) {
    return request(() => api<{ vjsf: PackageUnitForm }>(`/packages/${encodeURIComponent(id)}/units/new`), 'Unable to load the unit form.')
  }

  function createUnit(id: string, data: { code: string; title: string; metadata?: Record<string, unknown>; content?: Record<string, unknown> }) {
    return request(() => api<{ item: PackageUnit }>(`/packages/${encodeURIComponent(id)}/units/create`, {
      method: 'POST',
      body: { ...data, package_id: id },
    }), 'Unable to create the unit.')
  }

  return { loading, error, index, list: index, show, newUnitForm, createUnit }
})
