export type {
  AddedCatalogueCourse,
  CatalogueBlockTitle,
  CatalogueCourse,
  CatalogueCourseContent,
  CatalogueCourseUnitContent,
  CatalogueOutlineRow,
  CataloguePackage,
  CatalogueUnitSnapshot,
} from '~/stores/catalogue'

/** Compatibility composable. Catalogue API actions live in the Pinia store. */
export function useCatalogueApi() {
  return useCatalogueStore()
}
