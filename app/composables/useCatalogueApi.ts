import type { CoursePackage, PackageType } from '~/composables/usePackagesApi'

export interface CatalogueCourse {
  id: string
  package_id?: string
  type: PackageType
  code: string
  title: string
  status?: string
  published_version?: number
}

export interface CataloguePackage extends CoursePackage {
  metadata?: { thumbnail_url?: string }
}

export interface CatalogueUnitSnapshot {
  unit_id: string
  version: number
  unit: { id?: string; code?: string; title?: string; content?: Record<string, unknown> }
  blocks: CatalogueBlock[]
}

export interface CatalogueBlock {
  id: string
  type: string
  title?: string
  content?: Record<string, unknown>
  components?: { id: string; type: string; content?: Record<string, unknown> }[]
  children?: CatalogueBlock[]
}

export interface CatalogueCourseContent {
  course: CatalogueCourse & { description?: string }
  version: number
  units: CatalogueUnitSnapshot[]
  course_units: CatalogueOutlineRow[]
}

export interface CatalogueOutlineRow {
  id: string
  type: string
  title?: string
  unit_id?: string
  children?: CatalogueOutlineRow[]
}

export function useCatalogueApi() {
  const api = useApi()

  return {
    list() {
      return api<{ course_types: PackageType[]; items: CataloguePackage[]; courses: CatalogueCourse[] }>('/catalogue')
    },
    package(id: string) {
      return api<{ item: CataloguePackage; courses: CatalogueCourse[] }>(`/catalogue/packages/${encodeURIComponent(id)}`)
    },
    course(id: string) {
      return api<CatalogueCourseContent>(`/catalogue/courses/${encodeURIComponent(id)}`)
    },
  }
}
