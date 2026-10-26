<script setup lang="ts">
const dialogService = useDialogService()
</script>

<template>
  <component
    :is="dialog.component"
    v-for="dialog in dialogService.dialogs"
    :key="dialog.id"
    v-bind="dialog.props"
    :model-value="true"
    @update:model-value="!$event && dialogService.closeDialog(dialog.id)"
  />
</template>
