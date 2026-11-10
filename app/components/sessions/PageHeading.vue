<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description: string
}>()
</script>

<template>
  <div>
    <div class="text-overline text-primary font-weight-bold">{{ eyebrow }}</div>
    <h2 class="text-h4 font-weight-bold mt-2">{{ title }}</h2>
    <p class="text-body-2 text-medium-emphasis mt-3">{{ description }}</p>
  </div>
</template>
