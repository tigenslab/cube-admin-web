import { v4 as uuidv4 } from 'uuid'

/**
 * Creates a REST client configured from Nuxt runtimeConfig.
 * Set NUXT_PUBLIC_API_BASE to point the client at another API.
 */
export function useApi() {
  const config = useRuntimeConfig()
  const subdomain = getSubdomain(useRequestURL().hostname)
  const sessionId = useCookie<string | null>('session_id')

  return $fetch.create({
    baseURL: config.public.apiBase,
    onRequest({ request, options }) {
      const headers = new Headers(options.headers)
      const deviceId = getDeviceId()
      const requestUrl = typeof request === 'string' ? request : request.url

      if (deviceId) headers.set('x-device-id', deviceId)
      if (sessionId.value && !isLoginRequest(requestUrl)) {
        headers.set('session_id', sessionId.value)
      }
      headers.set('subdomain', subdomain)
      options.headers = headers
    },
    async onResponseError({ response }) {
      if (!sessionId.value || !isUnauthorizedResponse(response.status, response._data)) return

      const session = useSessionStore()
      session.clearSession()

      if (useRoute().path !== '/sessions/login') {
        await navigateTo('/sessions/login')
      }
    }
  })
}

function isUnauthorizedResponse(status: number, body: unknown) {
  if (status === 401) return true
  if (status < 400 || status >= 500 || !body || typeof body !== 'object') return false

  const errorBody = body as { error?: unknown; message?: unknown }
  return [errorBody.error, errorBody.message]
    .some(value => typeof value === 'string' && value.toLowerCase() === 'unauthorized')
}

function isLoginRequest(url: string) {
  return url.split('?')[0]?.replace(/\/+$/, '').endsWith('/sessions/login') ?? false
}

const getDeviceId = () => {
  if (import.meta.server) return null

  const key = 'x-device-id'
  const deviceId = localStorage.getItem(key) || uuidv4()

  localStorage.setItem(key, deviceId)

  return deviceId
}

function getSubdomain(hostname: string) {
  const labels = hostname.toLowerCase().split('.').filter(Boolean)

  if (labels.length > 0) return labels[0] ?? ''
 
  return ''
}

interface ApiErrorBody {
  error?: string
  details?: string
  message?: string
  body?: unknown
  data?: unknown
}

/** Returns the most useful message supplied by an API failure. */
export function getApiErrorMessage(cause: unknown, fallback: string) {
  if (cause && typeof cause === 'object') {
    const fetchError = cause as {
      data?: unknown
      response?: { _data?: unknown }
    }
    const message = extractApiError(fetchError.data ?? fetchError.response?._data)

    if (message) return message

    // FetchError.message only contains the request URL and HTTP status.
    if ('response' in fetchError || 'data' in fetchError) return fallback
  }

  return cause instanceof Error && cause.message ? cause.message : fallback
}

function extractApiError(value: unknown, depth = 0): string | null {
  if (depth > 3 || value == null) return null

  if (typeof value === 'string') {
    try {
      return extractApiError(JSON.parse(value), depth + 1) ?? value
    } catch {
      return value
    }
  }

  if (typeof value !== 'object') return null

  const body = value as ApiErrorBody

  if (typeof body.details === 'string' && body.details) return body.details
  const nestedMessage = extractApiError(body.body, depth + 1) ?? extractApiError(body.data, depth + 1)

  if (nestedMessage) return nestedMessage
  if (typeof body.message === 'string' && body.message) return body.message
  if (typeof body.error === 'string' && body.error) return body.error
  return null
}
