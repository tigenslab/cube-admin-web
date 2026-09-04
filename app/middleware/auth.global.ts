export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/sessions/login' || to.path === '/sessions/new-password' || to.path === '/sessions/forgot-password') return

  const sessionId = useCookie<string | null>('session_id')

  if (!sessionId.value) {
    return navigateTo('/sessions/login')
  }
})
