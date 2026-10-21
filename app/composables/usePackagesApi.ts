export type PackageType = 'SCHOOL::PRIMARY' | 'SCHOOL::SECONDARY' | 'RTO::NRT' | 'RTO::NON_NRT'

export interface CoursePackage {
  id: string
  account_id: string
  type: PackageType
  code: string
  title: string
  description?: string
  status?: string
}

export function usePackagesApi() {
  const api = useApi()

  return {
    list(type?: PackageType) {
      return api<{ items: CoursePackage[] }>('/packages', {
        query: type ? { type } : undefined,
      })
    },
  }
}
