/** Compatibility composable. Block component API actions live in the Pinia store. */
export function useUnitBlockComponentsApi() {
  return useUnitBlockComponentsStore()
}
