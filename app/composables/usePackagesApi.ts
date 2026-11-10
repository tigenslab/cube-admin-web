export type { CoursePackage, PackageCourse, PackageDetail, PackageType, PackageUnit, PackageUnitForm } from '~/stores/packages'

/** Compatibility composable. Package API actions live in the Pinia store. */
export function usePackagesApi() {
  return usePackagesStore()
}
