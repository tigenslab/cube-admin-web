import { defineStore } from 'pinia'
import type { PackageType, CoursePackage } from '~/stores/packages'
import { useApiActions } from '~/composables/useApiActions'

export interface CatalogueCourse {
  id: string
  package_id?: string
  type: PackageType
  type_label?: string
  code?: string
  title?: string
  level?: number
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

export const useCatalogueStore = defineStore('catalogue', () => {
  const { api, loading, error, request } = useApiActions('Unable to load the catalogue.')

  function index() {
    return request(() => api<{ course_types: PackageType[]; items: CataloguePackage[]; courses: CatalogueCourse[] }>('/catalogue'))
  }

  function packageDetails(id: string) {
    return request(() => api<{ item: CataloguePackage; courses: CatalogueCourse[] }>(`/catalogue/packages/${encodeURIComponent(id)}`), 'Unable to load this catalogue package.')
  }

  function course(id: string, version?: number) {
    const path = `/catalogue/courses/${encodeURIComponent(id)}`
    return request(() => api<CatalogueCourseContent>(version ? `${path}/versions/${version}` : path), 'Unable to load catalogue course content.')
  }

  function courseUnit(courseId: string, courseVersion: number | undefined, unitId: string) {
    const coursePath = `/catalogue/courses/${encodeURIComponent(courseId)}`
    const versionPath = courseVersion ? `/versions/${courseVersion}` : ''
    return request(() => api<CatalogueCourseUnitContent>(`${coursePath}${versionPath}/units/${encodeURIComponent(unitId)}`), 'Unable to load catalogue unit content.')
  }

  function addCourse(id: string) {
    return request(() => api<AddedCatalogueCourse>(`/catalogue/courses/${encodeURIComponent(id)}/add`, { method: 'POST' }), 'Unable to add this course to the organisation.')
  }

  return { loading, error, index, list: index, packageDetails, package: packageDetails, course, courseUnit, addCourse }
})
