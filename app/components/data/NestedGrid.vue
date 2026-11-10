<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  items: Record<string, any>[]
  selectedAttributes?: string[]
  childrenKey?: string
  searchLabel?: string
}>(), {
  selectedAttributes: () => [],
  childrenKey: 'children',
  searchLabel: 'Search',
})

const search = ref('')
const query = computed(() => search.value.trim().toLocaleLowerCase())

function matches(item: Record<string, any>) {
  const attributes = props.selectedAttributes.length
    ? props.selectedAttributes
    : Object.keys(item).filter(attribute => attribute !== props.childrenKey)

  return attributes.some((attribute) => {
    const value = item[attribute]
    return (typeof value === 'string' || typeof value === 'number')
      && String(value).toLocaleLowerCase().includes(query.value)
  })
}

function filterTree(items: Record<string, any>[]): Record<string, any>[] {
  if (!query.value) return items

  return items.flatMap((item) => {
    const children = Array.isArray(item[props.childrenKey]) ? item[props.childrenKey] : []
    if (matches(item)) return [item]

    const filteredChildren = filterTree(children)
    return filteredChildren.length
      ? [{ ...item, [props.childrenKey]: filteredChildren }]
      : []
  })
}

const filteredItems = computed(() => filterTree(props.items))
</script>

<template>
  <VToolbar class="px-2 mb-3" color="transparent">
    <VTextField
      v-model="search"
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

  <VExpansionPanels variant="accordion">
    <VExpansionPanel v-for="(parent, index) in filteredItems" :key="parent.id ?? index">
      <VExpansionPanelTitle>
        <slot name="parent-title" :parent="parent">
          {{ parent.title ?? parent.name ?? parent.code ?? 'Item' }}
        </slot>
      </VExpansionPanelTitle>
      <VExpansionPanelText>
        <VRow v-if="Array.isArray(parent[childrenKey]) && parent[childrenKey].length">
          <VCol v-for="(child, childIndex) in parent[childrenKey]" :key="child.id ?? childIndex" cols="12" :md="Array.isArray(child[childrenKey]) && child[childrenKey].length ? 12 : 4">
            <DataNestedGridNode :item="child" :level="1" :children-key="childrenKey">
              <template #parent-title="slotData">
                <slot name="parent-title" v-bind="slotData">{{ slotData.parent.title ?? slotData.parent.name ?? slotData.parent.code ?? 'Item' }}</slot>
              </template>
              <template #group-title="slotData">
                <slot name="group-title" v-bind="slotData">{{ slotData.child.title ?? slotData.child.name ?? slotData.child.code ?? 'Group' }}</slot>
              </template>
              <template #group_title="slotData">
                <slot name="group_title" v-bind="slotData">
                  <slot name="group-title" v-bind="slotData">{{ slotData.child.title ?? slotData.child.name ?? slotData.child.code ?? 'Group' }}</slot>
                </slot>
              </template>
              <template #sub_group_title="slotData">
                <slot name="sub_group_title" v-bind="slotData">
                  <slot name="group-title" v-bind="slotData">{{ slotData.child.title ?? slotData.child.name ?? slotData.child.code ?? 'Group' }}</slot>
                </slot>
              </template>
              <template #child-item="slotData"><slot name="child-item" v-bind="slotData" /></template>
            </DataNestedGridNode>
          </VCol>
        </VRow>
        <slot v-else name="child-item" :child="parent" />
      </VExpansionPanelText>
    </VExpansionPanel>
  </VExpansionPanels>
</template>
