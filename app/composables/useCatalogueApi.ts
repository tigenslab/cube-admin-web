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

export interface CatalogueCourseUnitContent {
  course_id: string
  course_version: number
  unit_version: number
  unit: Record<string, any> & { id: string; code?: string; title?: string }
  blocks: Record<string, any>[]
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
  versions: number[]
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
  catalogue_source?: boolean
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
    course(id: string, version?: number) {
      const path = `/catalogue/courses/${encodeURIComponent(id)}`
      return api<CatalogueCourseContent>(version ? `${path}/versions/${version}` : path)
    },
    courseUnit(courseId: string, courseVersion: number | undefined, unitId: string) {
      const coursePath = `/catalogue/courses/${encodeURIComponent(courseId)}`
      const versionPath = courseVersion ? `/versions/${courseVersion}` : ''
      return api<CatalogueCourseUnitContent>(`${coursePath}${versionPath}/units/${encodeURIComponent(unitId)}`)
    },
    addCourse(id: string) {
      return api<AddedCatalogueCourse>(`/catalogue/courses/${encodeURIComponent(id)}/add`, {
        method: 'POST',
      })
    },
  }
}
