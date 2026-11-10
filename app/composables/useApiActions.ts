/** Shared request state and error handling for API actions owned by Pinia stores. */
export function useApiActions(defaultError = 'The request could not be completed.') {
  const api = useApi()
  const pendingRequests = ref(0)
  const pendingActions = ref<Record<string, number>>({})
  const loading = computed(() => pendingRequests.value > 0)
  const actionLoading = computed(() => Object.fromEntries(
    Object.entries(pendingActions.value).map(([key, count]) => [key, count > 0]),
  ))
  const error = ref<string | null>(null)

  async function request<T>(operation: () => Promise<T>, fallback = defaultError, actionKey?: string) {
    pendingRequests.value += 1
    if (actionKey) pendingActions.value[actionKey] = (pendingActions.value[actionKey] || 0) + 1
    error.value = null
    try {
      return await operation()
    } catch (cause) {
      error.value = getApiErrorMessage(cause, fallback)
      throw cause
    } finally {
      pendingRequests.value -= 1
      if (actionKey) {
        const remaining = (pendingActions.value[actionKey] || 1) - 1
        if (remaining) pendingActions.value[actionKey] = remaining
        else delete pendingActions.value[actionKey]
      }
    }
  }

  return { api, loading, actionLoading, error, request }
}
