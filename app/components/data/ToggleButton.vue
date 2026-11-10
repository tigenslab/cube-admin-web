<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

export interface DataViewOption {
  value: string
  icon: string
  label?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  storageKey?: string
  options?: DataViewOption[]
}>(), {
  options: () => [
    { value: 'list', icon: 'mdi-format-list-bulleted', label: 'List view' },
    { value: 'grid', icon: 'mdi-grid', label: 'Grid view' },
  ],
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const internalValue = ref(props.modelValue)
const validValue = (value: string) => props.options.some(option => option.value === value)
const optionItems = computed(() => props.options)

onMounted(() => {
  if (!props.storageKey) return
  const savedValue = window.localStorage.getItem(props.storageKey)
  if (savedValue && validValue(savedValue)) internalValue.value = savedValue
})

watch(internalValue, (value) => {
  if (!validValue(value)) return
  emit('update:modelValue', value)
  if (props.storageKey && import.meta.client) window.localStorage.setItem(props.storageKey, value)
})

watch(() => props.modelValue, (value) => {
  if (validValue(value)) internalValue.value = value
})
</script>

<template>
  <VBtnToggle v-model="internalValue" mandatory>
    <ButtonsBase
      v-for="option in optionItems"
      :key="option.value"
      :aria-label="option.label ?? option.value"
      :title="option.label ?? option.value"
      :value="option.value"
      :icon="option.icon"
      mode="icon"
      size="small"
      variant="text"
    />
  </VBtnToggle>
</template>
