<script setup lang="ts">
import UnitBuilderEditor from '~/components/course-content/UnitBuilderEditor.vue'

definePageMeta({ layout: false })
</script>

<template>
  <div class="unit-builder-route">
    <UnitBuilderEditor />
  </div>
</template>

<style scoped>
.unit-builder-route {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
