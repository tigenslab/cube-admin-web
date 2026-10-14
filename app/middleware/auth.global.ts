export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/sessions/login' || to.path === '/sessions/new-password' || to.path === '/sessions/forgot-password') return

  // session_id and device_id are issued by the API origin. During SSR the
  // browser sends cookies only for the Nuxt origin, so the API cookies are
  // unavailable to this server-side guard. Validate the session in the
  // browser, where credentials: 'include' sends them to the API directly.
  if (import.meta.server) return

  const session = useSessionStore()
  if (!session.isAuthenticated && !(await session.hydrate())) {
    return navigateTo('/sessions/login')
  }
})
