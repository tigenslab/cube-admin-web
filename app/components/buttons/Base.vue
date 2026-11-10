<script setup lang="ts">
import { useBaseButton, type BaseButtonAction, type BaseButtonVariant } from '~/composables/useBaseButton'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  store?: object
  action?: BaseButtonAction
  storeAction?: string
  submitAction?: string
  params?: Record<string, unknown>
  dialogParams?: Record<string, unknown>
  noConfirmDialog?: boolean
  tooltipText?: string
  tooltipDisabled?: boolean
  tooltipLocation?: string
  btnText?: string
  btnIcon?: string
  btnVariant?: BaseButtonVariant
  variant?: BaseButtonVariant
  mode?: 'button' | 'text' | 'icon'
  icon?: string | boolean
  prependIcon?: string
  appendIcon?: string
  loading?: boolean
}>(), {
  noConfirmDialog: false,
  tooltipDisabled: false,
  mode: 'button',
})

const emit = defineEmits<{
  click: [event: unknown]
  success: [value: unknown]
  error: [cause: unknown]
}>()

const {
  btnText,
  btnVariant,
  btnPrependIcon,
  btnIcon,
  appendIcon,
  tooltipText,
  tooltipDisabled,
  tooltipLocation,
  loading,
  handler,
} = useBaseButton(props, emit)
</script>

<template>
  <VTooltip v-if="tooltipText && !tooltipDisabled" :location="tooltipLocation" :text="tooltipText">
    <template #activator="{ props: tooltipProps }">
      <span>
        <VBtn
          v-bind="{ ...tooltipProps, ...$attrs }"
          :append-icon="appendIcon"
          :icon="btnIcon"
          :loading="loading"
          :prepend-icon="btnPrependIcon"
          :variant="btnVariant"
          @click="handler"
        ><slot>{{ btnText }}</slot></VBtn>
      </span>
    </template>
  </VTooltip>
  <VBtn
    v-else
    v-bind="$attrs"
    :append-icon="appendIcon"
    :icon="btnIcon"
    :loading="loading"
    :prepend-icon="btnPrependIcon"
    :variant="btnVariant"
    @click="handler"
  ><slot>{{ btnText }}</slot></VBtn>
</template>
