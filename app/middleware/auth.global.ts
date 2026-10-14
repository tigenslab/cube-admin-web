export default defineNuxtRouteMiddleware(async (to) => {
  const session = useSessionStore()
  if (to.path === '/sessions/login' || to.path === '/sessions/forgot-password') {
    if (session.isAuthenticated || (import.meta.client && await session.hydrate())) {
      return navigateTo('/')
    }
    return
  }
  if (to.path === '/sessions/new-password') return

  // session_id and device_id are issued by the API origin. During SSR the
  // browser sends cookies only for the Nuxt origin, so the API cookies are
  // unavailable to this server-side guard. Validate the session in the
  // browser, where credentials: 'include' sends them to the API directly.
  if (import.meta.server) return

  if (!session.isAuthenticated && !(await session.hydrate())) {
    return navigateTo('/sessions/login')
  }
})
