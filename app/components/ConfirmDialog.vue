<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmColor?: string
}>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmColor: 'primary',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

function cancel() {
  emit('update:modelValue', false)
}

function confirm() {
  emit('confirm')
  emit('update:modelValue', false)
}
</script>

<template>
  <VDialog :model-value="modelValue" max-width="440" @update:model-value="emit('update:modelValue', $event)">
    <VCard rounded="xl">
      <VCardTitle class="pa-6 pb-2">{{ title }}</VCardTitle>
      <VCardText class="px-6 pt-2">{{ message }}</VCardText>
      <VCardActions class="px-6 pb-6">
        <VSpacer />
        <VBtn variant="text" @click="cancel">{{ cancelText }}</VBtn>
        <VBtn :color="confirmColor" @click="confirm">{{ confirmText }}</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
