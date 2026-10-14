<script setup lang="ts">
const session = useSessionStore()
const isMounted = ref(false)
const showLoader = computed(() => !isMounted.value || session.isHydrating)

watch(() => session.isHydrating, (isHydrating, previousValue) => {
  console.debug('[app] isHydrating changed', {
    previousValue,
    isHydrating,
    isAuthenticated: session.isAuthenticated,
    environment: import.meta.server ? 'server' : 'client'
  })
}, { immediate: true, flush: 'sync' })

onMounted(() => {
  isMounted.value = true
})
</script>

<template>
  <VApp>
    <div v-if="showLoader" class="session-loader" role="status" aria-live="polite">
      <VProgressLinear class="session-progress" indeterminate color="primary" rounded height="6" aria-label="Checking your session" />
    </div>
    <NuxtRouteAnnouncer />
    <NuxtLayout v-if="!showLoader">
      <NuxtPage />
    </NuxtLayout>
  </VApp>
</template>

<style scoped>
.session-loader {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-background));
}

.session-progress {
  flex: 0 0 240px;
  max-width: 80vw;
}

/* The initial session check finishes before Vuetify's visibility observer mounts. */
.session-progress :deep(.v-progress-linear__indeterminate) {
  animation-play-state: running;
}
</style>
