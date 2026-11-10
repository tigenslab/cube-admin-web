/** Shared request state and error handling for API actions owned by Pinia stores. */
export function useApiActions(defaultError = 'The request could not be completed.') {
  const api = useApi()
  const pendingRequests = ref(0)
  const loading = computed(() => pendingRequests.value > 0)
  const error = ref<string | null>(null)

  async function request<T>(operation: () => Promise<T>, fallback = defaultError) {
    pendingRequests.value += 1
    error.value = null
    try {
      return await operation()
    } catch (cause) {
      error.value = getApiErrorMessage(cause, fallback)
      throw cause
    } finally {
      pendingRequests.value -= 1
    }
  }

  return { api, loading, error, request }
}
