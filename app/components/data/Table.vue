<script setup lang="ts">
import { computed, ref, useSlots, watch } from 'vue'

const props = withDefaults(defineProps<{
  headers: any[]
  items?: any[]
  itemKey?: string
  itemsPerPage?: number
  loading?: boolean
  showSearch?: boolean
  searchLabel?: string
  search?: string
}>(), {
  items: () => [],
  itemKey: 'id',
  itemsPerPage: 5,
  loading: false,
  showSearch: true,
  searchLabel: 'Search',
  search: '',
})

const emit = defineEmits<{ 'update:search': [value: string] }>()
const slots = useSlots()
const localSearch = ref(props.search)
watch(() => props.search, (value) => {
  localSearch.value = value
})
const searchModel = computed({
  get: () => localSearch.value,
  set: (value: string | null) => {
    localSearch.value = value ?? ''
    emit('update:search', localSearch.value)
  },
})
const tableSlots = computed(() => Object.fromEntries(
  Object.entries(slots).filter(([name]) => name !== 'header_action'),
))
</script>

<template>
  <VCard elevation="0">
    <VToolbar v-if="showSearch" class="px-2 mb-3" color="transparent">
      <VTextField
        v-model="searchModel"
        clearable
        density="comfortable"
        hide-details
        :label="searchLabel"
        placeholder="Search"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 300px"
        variant="solo"
      />
      <VSpacer />
      <slot name="header_action" />
    </VToolbar>

    <VDataTable
      :headers="headers"
      :items="items"
      :item-value="itemKey"
      :items-per-page="itemsPerPage"
      :loading="loading"
      :search="searchModel"
    >
      <template v-for="(_, name) in tableSlots" :key="name" #[name]="slotData">
        <slot :name="name" v-bind="slotData" />
      </template>
    </VDataTable>
  </VCard>
</template>
