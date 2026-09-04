<script setup lang="ts">
const session = useSessionStore()

onMounted(() => {
  session.hydrate()
})
</script>

<template>
  <VApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </VApp>
</template>
