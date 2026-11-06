<script setup lang="ts">
import UnitViewer from '~/components/course-content/UnitViewer.vue'

definePageMeta({ layout: false })
</script>

<template>
  <UnitViewer :key="String($route.params.unitId)" />
</template>
