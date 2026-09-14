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
  phone?: string
}

interface LoginResponse {
  id?: string
  session_id?: string
  accessToken?: string
  token?: string
  user?: SessionUser
  error?: string
  details?: string
  message?: string
  data?: Omit<LoginResponse, 'data'>
  challenge?: string
  session?: string
  challengeParams?: Record<string, unknown>
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
    lastAction: null as 'login' | 'set-password' | 'change-password' | null,
    pendingChallenge: null as { username: string; session: string } | null
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

        if (payload.challenge === 'NEW_PASSWORD_REQUIRED' && payload.session) {
          this.pendingChallenge = { username: credentials.username, session: payload.session }
          return payload
        }

        const sessionId = useCookie<string | null>('session_id', {
          secure: !import.meta.dev,
          sameSite: 'strict',
          path: '/'
        })
        sessionId.value = payload.session_id ?? null
        this.user = payload.user ?? null
        this.userUsername = payload.user?.username ?? credentials.username
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

    async hydrate() {
      const sessionId = useCookie<string | null>('session_id', { secure: !import.meta.dev, sameSite: 'strict', path: '/' })
      if (!sessionId.value || this.isAuthenticated) return false

      try {
        const response = await useApi()<LoginResponse>('/sessions/current')
        const payload = response.data ?? response
        const storedUser = (payload.user ?? (payload as LoginResponse & { user_json?: SessionUser }).user_json) as SessionUser | undefined
        this.user = storedUser ?? (payload.username ? { username: payload.username } : null)
        this.userUsername = this.user?.username ?? payload.username ?? ''
        this.isAuthenticated = true
        return true
      } catch {
        this.clearSession()
        return false
      }
    },

    async completeNewPassword(newPassword: string, attributes: Record<string, string> = {}) {
      if (!this.pendingChallenge) throw new Error('Password challenge has expired. Please sign in again.')

      this.loading = true
      this.error = null
      try {
        const api = useApi()
        const response = await api<LoginResponse>('/sessions/new-password', {
          method: 'POST',
          body: {
            username: this.pendingChallenge.username,
            session: this.pendingChallenge.session,
            newPassword,
            attributes
          }
        })
        const payload = response.data ?? response
        const apiError = payload.details ?? (payload.error ? payload.message ?? payload.error : '')
        if (apiError) throw new Error(apiError)

        const sessionId = useCookie<string | null>('session_id', { secure: !import.meta.dev, sameSite: 'strict', path: '/' })
        sessionId.value = payload.session_id ?? null
        this.pendingChallenge = null
        this.isAuthenticated = true
        return payload
      } catch (cause) {
        this.error = getApiErrorMessage(cause, 'Unable to set your password. Please try again.')
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

    clearSession() {
      const sessionId = useCookie<string | null>('session_id')

      sessionId.value = null
      this.username = ''
      this.userUsername = ''
      this.user = null
      this.accessToken = null
      this.isAuthenticated = false
      this.error = null
      this.lastAction = null
      this.pendingChallenge = null
    },

    async logout() {
      let logoutError: string | null = null
      try {
        const api = useApi()
        await api('/sessions/logout', { method: 'DELETE' })
      } catch (cause) {
        logoutError = getApiErrorMessage(cause, 'Unable to complete logout on the server.')
      } finally {
        this.clearSession()
        this.error = logoutError
      }
    },

    clearFeedback() {
      this.lastAction = null
    }
  }
})
