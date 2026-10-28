import type { ApiNewForm } from '~/types/api-form'
import type { VersionMetadata } from '~/types/course-resources'

export type PackageType = 'SCH:PRY' | 'SCH:SEC' | 'RTO:NRT' | 'RTO:NAT'

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
  status?: string
  permissions?: Record<string, boolean>
}

export interface PackageUnit {
  id: string
  code: string
  title: string
  versions?: VersionMetadata[]
  content?: Record<string, unknown>
}

export interface PackageDetail {
  item: CoursePackage
  courses: PackageCourse[]
  units: PackageUnit[]
  permissions: { create_course: boolean; create_unit: boolean }
}

export function usePackagesApi() {
  const api = useApi()

  return {
    list(type?: PackageType) {
      return api<{ items: CoursePackage[] }>('/packages', {
        query: type ? { type } : undefined,
      })
    },
    show(id: string) {
      return api<PackageDetail>(`/packages/${encodeURIComponent(id)}`)
    },
    newUnitForm(id: string) {
      return api<{ vjsf: ApiNewForm<Partial<Pick<PackageUnit, 'code' | 'title'>> & { type?: string }> }>(`/packages/${encodeURIComponent(id)}/units/new`)
    },
    createUnit(id: string, type: string, data: { code: string; title: string }) {
      return api<{ item: PackageUnit }>(`/packages/${encodeURIComponent(id)}/units/create`, {
        method: 'POST',
        body: { ...data, type, content: {} },
      })
    },
  }
}
