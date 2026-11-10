import { defineStore } from 'pinia'

export interface LoginCredentials {
  username: string
  password: string
}

export interface SessionUser {
  id?: string | number
  username?: string
  email?: string | null
  name?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  roles?: string[]
  valid_roles?: string[]
  current_role?: string | null
  permissions?: Record<string, string[]>
}

export interface ProfileUser extends SessionUser {
  email?: string | null
  name?: string | null
  phone?: string | null
  first_name?: string | null
  last_name?: string | null
}

export interface ActiveSession {
  id: string
  user_id?: string
  username?: string
  device_id?: string
  ip_address?: string
  request_json?: { device_information?: { user_agent?: string } }
  permissions?: Record<string, string[]>
  created_at?: string
  updated_at?: string
}

export interface SessionNavigationItem {
  title: string
  icon: string
  to: string
}

export type SessionNavigation = SessionNavigationItem[]

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
  roles?: string[]
  valid_roles?: string[]
  current_role?: string | null
  permissions?: Record<string, string[]>
  navigation?: SessionNavigation
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    username: '',
    userUsername: '',
    user: null as SessionUser | null,
    accessToken: null as string | null,
    isAuthenticated: false,
    isHydrating: false,
    loading: false,
    error: null as string | null,
    lastAction: null as 'login' | 'set-password' | 'change-password' | null,
    pendingChallenge: null as { username: string; session: string } | null,
    roles: [] as string[],
    validRoles: [] as string[],
    currentRole: null as string | null,
    permissions: {} as Record<string, string[]>,
    navigation: [] as SessionNavigation,
    activeSessions: [] as ActiveSession[]
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

        this.user = payload.user ?? null
        this.roles = payload.roles ?? payload.user?.roles ?? []
        this.validRoles = payload.valid_roles ?? this.roles
        this.currentRole = payload.current_role ?? payload.user?.current_role ?? null
        this.permissions = payload.permissions ?? {}
        this.navigation = payload.navigation ?? this.navigation
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
      console.debug('[session.hydrate] called', {
        isAuthenticated: this.isAuthenticated,
        isHydrating: this.isHydrating,
        environment: import.meta.server ? 'server' : 'client'
      })
      if (this.isAuthenticated) {
        console.debug('[session.hydrate] skipped: already authenticated')
        return false
      }

      this.isHydrating = true
      console.debug('[session.hydrate] started', { isHydrating: this.isHydrating })
      try {
        const response = await useApi()<LoginResponse>('/sessions/current')
        const payload = response.data ?? response
        const storedUser = (payload.user ?? (payload as LoginResponse & { user_json?: SessionUser }).user_json) as SessionUser | undefined
        this.user = storedUser ?? (payload.username ? { username: payload.username } : null)
        this.roles = payload.roles ?? this.user?.roles ?? []
        this.validRoles = payload.valid_roles ?? this.roles
        this.currentRole = payload.current_role ?? this.user?.current_role ?? null
        this.permissions = payload.permissions ?? {}
        this.navigation = payload.navigation ?? []
        this.userUsername = this.user?.username ?? payload.username ?? ''
        this.isAuthenticated = true
        return true
      } catch {
        this.clearSession()
        return false
      } finally {
        this.isHydrating = false
        console.debug('[session.hydrate] finished', {
          isHydrating: this.isHydrating,
          isAuthenticated: this.isAuthenticated
        })
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

        this.pendingChallenge = null
        this.roles = payload.roles ?? payload.user?.roles ?? []
        this.validRoles = payload.valid_roles ?? this.roles
        this.currentRole = payload.current_role ?? payload.user?.current_role ?? null
        this.permissions = payload.permissions ?? {}
        this.navigation = payload.navigation ?? this.navigation
        this.isAuthenticated = true
        return payload
      } catch (cause) {
        this.error = getApiErrorMessage(cause, 'Unable to set your password. Please try again.')
        throw cause
      } finally {
        this.loading = false
      }
    },

    async changeRole(role: string) {
      return this.runApiAction(async () => {
        const payload = await useApi()<LoginResponse>('/sessions/change-role', {
          method: 'POST',
          body: { role }
        })
        const response = payload.data ?? payload
        this.roles = response.roles ?? this.roles
        this.validRoles = response.valid_roles ?? this.validRoles
        this.currentRole = response.current_role ?? role
        this.permissions = response.permissions ?? this.permissions
        this.navigation = response.navigation ?? this.navigation
        return response
      }, 'Unable to change your role.')
    },

    requestPasswordReset(username: string) {
      return this.runApiAction(() => useApi()('/sessions/forgot-token', {
        method: 'POST', body: { username }
      }), 'Unable to process your request. Please try again.')
    },

    resetPassword(input: { username: string; confirmation_code: string; password: string; password_confirmation: string }) {
      return this.runApiAction(() => useApi()('/sessions/reset-password', {
        method: 'POST', body: input
      }), 'Unable to reset your password. Please try again.')
    },

    async loadActiveSessions() {
      return this.runApiAction(async () => {
        this.activeSessions = await useApi()<ActiveSession[]>('/sessions/active')
        return this.activeSessions
      }, 'Unable to load active sessions.')
    },

    async loadProfile() {
      return this.runApiAction(async () => {
        const user = await useApi()<ProfileUser>('/sessions/user')
        this.user = user
        this.userUsername = user.username ?? ''
        return user
      }, 'Unable to load your profile.')
    },

    async updateProfile(data: Pick<ProfileUser, 'first_name' | 'last_name'>) {
      return this.runApiAction(async () => {
        const user = await useApi()<ProfileUser>('/sessions/user', { method: 'PATCH', body: data })
        this.user = user
        this.userUsername = user.username ?? this.userUsername
        return user
      }, 'Unable to update your profile.')
    },

    requestEmailVerification(email: string) {
      return this.runApiAction(() => useApi()('/sessions/user/email-verification', {
        method: 'POST', body: { email }
      }), 'Unable to update your email address.')
    },

    confirmEmailVerification(code: string) {
      return this.runApiAction(() => useApi()('/sessions/user/email-verification/confirm', {
        method: 'POST', body: { code }
      }), 'The verification code is invalid.')
    },

    requestPhoneVerification(phone: string) {
      return this.runApiAction(() => useApi()('/sessions/user/phone-verification', {
        method: 'POST', body: { phone }
      }), 'Unable to update your phone number.')
    },

    confirmPhoneVerification(code: string) {
      return this.runApiAction(() => useApi()('/sessions/user/phone-verification/confirm', {
        method: 'POST', body: { code }
      }), 'The verification code is invalid.')
    },

    setPassword() {
      this.lastAction = 'set-password'
    },

    async changePassword(currentPassword: string, newPassword: string, passwordConfirmation: string) {
      this.loading = true
      this.error = null
      try {
        await useApi()('/sessions/change-password', {
          method: 'POST',
          body: {
            current_password: currentPassword,
            new_password: newPassword,
            password_confirmation: passwordConfirmation
          }
        })
        this.clearSession()
        await navigateTo('/sessions/login')
      } catch (cause) {
        this.error = getApiErrorMessage(cause, 'Unable to change your password. Please try again.')
        throw cause
      } finally {
        this.loading = false
      }
      this.lastAction = 'change-password'
    },

    clearSession() {
      this.username = ''
      this.userUsername = ''
      this.user = null
      this.accessToken = null
      this.isAuthenticated = false
      this.error = null
      this.lastAction = null
      this.pendingChallenge = null
      this.roles = []
      this.validRoles = []
      this.currentRole = null
      this.permissions = {}
      this.navigation = []
      this.activeSessions = []
    },

    async runApiAction<T>(operation: () => Promise<T>, fallback: string) {
      this.loading = true
      this.error = null
      try {
        return await operation()
      } catch (cause) {
        this.error = getApiErrorMessage(cause, fallback)
        throw cause
      } finally {
        this.loading = false
      }
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
