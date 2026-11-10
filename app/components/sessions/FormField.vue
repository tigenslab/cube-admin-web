<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  modelValue: string
  id: string
  label: string
  type?: string
  placeholder?: string
  autocomplete?: string
  prependIcon?: string
  hint?: string
  persistentHint?: boolean
  density?: 'default' | 'comfortable' | 'compact'
  labelClass?: string
  fieldClass?: string
  containerClass?: string
  required?: boolean
}>(), {
  type: 'text',
  persistentHint: false,
  labelClass: 'text-body-2 font-weight-medium',
  fieldClass: 'mt-2',
  required: true,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div :class="containerClass">
    <div class="d-flex align-center justify-space-between">
      <label :class="labelClass" :for="id">{{ label }}</label>
      <slot name="label-action" />
    </div>
    <VTextField
      v-bind="$attrs"
      :id="id"
      :model-value="modelValue"
      :autocomplete="autocomplete"
      :class="fieldClass"
      :density="density"
      :hint="hint"
      :persistent-hint="persistentHint"
      :placeholder="placeholder"
      :prepend-inner-icon="prependIcon"
      :required="required"
      rounded="lg"
      :type="type"
      variant="outlined"
      @update:model-value="emit('update:modelValue', String($event ?? ''))"
    />
  </div>
</template>
