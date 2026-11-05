import type { CoursePackage, PackageType } from '~/composables/usePackagesApi'
import { useApi } from '~/composables/useApi'

export interface CatalogueCourse {
  id: string
  package_id?: string
  type: PackageType
  type_label?: string
  code?: string
  title?: string
}

export interface CataloguePackage extends CoursePackage {
  type_label: string
  metadata?: { thumbnail_url?: string }
}

export interface CatalogueUnitSnapshot {
  unit_id: string
  version: number
  unit: { id?: string; code?: string; title?: string }
  blocks: CatalogueBlockTitle[]
}

export interface CatalogueBlockTitle {
  id?: string
  title: string
  type?: string
  icon?: string
  children?: CatalogueBlockTitle[]
}

export interface CatalogueCourseContent {
  course: CatalogueCourse & { description?: string }
  version: number
  units: CatalogueUnitSnapshot[]
  course_units: CatalogueOutlineRow[]
}

export interface AddedCatalogueCourse {
  course: { id: string }
  created: boolean
}

export interface CatalogueOutlineRow {
  id: string
  type: string
  title?: string
  code?: string
  unit_id?: string
  ancestry?: string
  position?: number
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
    addCourse(id: string) {
      return api<AddedCatalogueCourse>(`/catalogue/courses/${encodeURIComponent(id)}/add`, {
        method: 'POST',
      })
    },
  }
}
