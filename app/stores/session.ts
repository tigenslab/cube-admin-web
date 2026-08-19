import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', {
  state: () => ({
    email: '',
    userEmail: '',
    isAuthenticated: false,
    lastAction: null as 'login' | 'set-password' | 'change-password' | null
  }),

  actions: {
    signIn() {
      this.userEmail = this.email
      this.isAuthenticated = true
      this.lastAction = 'login'
    },

    setPassword() {
      this.lastAction = 'set-password'
    },

    changePassword() {
      this.lastAction = 'change-password'
    },

    clearFeedback() {
      this.lastAction = null
    }
  }
})
