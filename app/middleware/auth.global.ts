export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/sessions/login') return

  const sessionId = useCookie<string | null>('session_id')

  if (!sessionId.value) {
    return navigateTo('/sessions/login')
  }
})
