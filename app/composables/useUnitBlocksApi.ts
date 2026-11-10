/** Compatibility composable. Block API actions live in the Pinia store. */
export function useUnitBlocksApi() {
  return useUnitBlocksStore()
}
