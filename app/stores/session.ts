import { defineStore } from 'pinia'

export interface LoginCredentials {
  username: string
  password: string
}

export interface SessionUser {
  id?: string | number
  username?: string
  email?: string
  name?: string
}

interface LoginResponse {
  session_id?: string
  accessToken?: string
  token?: string
  user?: SessionUser
  error?: string
  details?: string
  message?: string
  data?: Omit<LoginResponse, 'data'>
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    username: '',
    userUsername: '',
    user: null as SessionUser | null,
    accessToken: null as string | null,
    isAuthenticated: false,
    loading: false,
    error: null as string | null,
    lastAction: null as 'login' | 'set-password' | 'change-password' | null
  }),

  actions: {
    async login(credentials: LoginCredentials) {
      this.loading = true
      this.error = null
      this.lastAction = null

      try {
        const api = useApi()
        const response = await api<LoginResponse>('/sessions/login', {
          method: 'POST',
          body: credentials
        })
        const payload = response.data ?? response
        const apiError = payload.details ?? (payload.error ? payload.message ?? payload.error : '')

        if (apiError) throw new Error(apiError)

        const sessionId = useCookie<string | null>('session_id', { sameSite: 'lax' })
        sessionId.value = payload.session_id ?? null
        this.user = payload.user ?? null
        this.userUsername = payload.user?.username ?? credentials.username
        this.accessToken = payload.accessToken ?? payload.token ?? null
        this.isAuthenticated = true
        this.lastAction = 'login'

        return payload
      } catch (cause) {
        this.error = getApiErrorMessage(cause, 'Unable to sign in. Please try again.')
        throw cause
      } finally {
        this.loading = false
      }
    },

    setPassword() {
      this.lastAction = 'set-password'
    },

    changePassword() {
      this.lastAction = 'change-password'
    },

    async logout() {
      const sessionId = useCookie<string | null>('session_id')

      try {
        const api = useApi()
        await api('/sessions/logout', { method: 'DELETE' })
      } finally {
        sessionId.value = null
        this.username = ''
        this.userUsername = ''
        this.user = null
        this.accessToken = null
        this.isAuthenticated = false
        this.error = null
        this.lastAction = null
      }
    },

    clearFeedback() {
      this.lastAction = null
    }
  }
})
