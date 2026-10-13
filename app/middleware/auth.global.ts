export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/sessions/login' || to.path === '/sessions/new-password' || to.path === '/sessions/forgot-password') return

  const session = useSessionStore()
  if (!session.isAuthenticated && !(await session.hydrate())) {
    return navigateTo('/sessions/login')
  }
})
