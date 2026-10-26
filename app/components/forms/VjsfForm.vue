<script setup lang="ts">
import type { ApiFormSchema } from '~/types/api-form'
import { defineComponent, h } from 'vue'

const props = defineProps<{
  schema: ApiFormSchema
  options?: Record<string, unknown>
}>()

const model = defineModel<Record<string, any>>({ required: true })
const loadError = ref('')
const EmptyVjsf = defineComponent({ setup: () => () => h('span') })
const Vjsf = defineAsyncComponent({
  loader: () => import('@koumoul/vjsf'),
  errorComponent: EmptyVjsf,
  onError(cause, _retry, fail) {
    loadError.value = cause instanceof Error ? cause.message : 'VJSF could not be loaded.'
    fail()
  },
})
const properties = computed(() => Object.entries(
  (props.schema.properties ?? {}) as Record<string, { title?: string; type?: string; format?: string; enum?: unknown[] }>,
).map(([key, schema]) => ({ key, ...schema })))

function setObjectField(key: string, rawValue: string) {
  try {
    model.value[key] = rawValue.trim() ? JSON.parse(rawValue) : {}
  } catch {
    // Keep the last valid value while the user edits JSON.
  }
}

function objectFieldValue(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}
</script>

<template>
  <Vjsf v-if="!loadError" v-model="model" :options="options" :schema="schema" />
  <div v-else>
    <VAlert class="mb-4" color="warning" density="compact" variant="tonal">
      {{ loadError }} Showing the schema fields with standard inputs.
    </VAlert>
    <template v-for="field in properties" :key="field.key">
      <VSelect v-if="field.enum" v-model="model[field.key]" :items="field.enum" :label="field.title || field.key" />
      <VCombobox v-else-if="field.type === 'array'" v-model="model[field.key]" chips :label="field.title || field.key" multiple />
      <VTextarea
        v-else-if="field.type === 'object'"
        :label="field.title || field.key"
        :model-value="objectFieldValue(model[field.key])"
        @update:model-value="setObjectField(field.key, $event)"
      />
      <VTextField
        v-else
        v-model="model[field.key]"
        :label="field.title || field.key"
        :type="field.format === 'email' ? 'email' : field.format === 'password' ? 'password' : field.type === 'integer' || field.type === 'number' ? 'number' : 'text'"
      />
    </template>
  </div>
</template>
