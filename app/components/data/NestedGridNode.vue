<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'DataNestedGridNode' })

const props = withDefaults(defineProps<{
  item: Record<string, any>
  level?: number
  childrenKey?: string
}>(), {
  level: 0,
  childrenKey: 'children',
})

const children = computed(() => Array.isArray(props.item[props.childrenKey]) ? props.item[props.childrenKey] : [])
const hasChildren = computed(() => children.value.length > 0)
const titleSlot = computed(() => props.level === 0 ? 'parent-title' : props.level === 1 ? 'group_title' : 'sub_group_title')
</script>

<template>
  <VExpansionPanels v-if="hasChildren" class="nested-grid-panels" variant="accordion">
    <VExpansionPanel>
      <VExpansionPanelTitle>
        <slot :name="titleSlot" :child="item" :parent="item">
          <slot name="group-title" :child="item" :parent="item">
            {{ item.title ?? item.name ?? item.code ?? 'Group' }}
          </slot>
        </slot>
      </VExpansionPanelTitle>
      <VExpansionPanelText>
        <VRow>
          <VCol
            v-for="(child, index) in children"
            :key="child.id ?? index"
            cols="12"
            :md="Array.isArray(child[childrenKey]) && child[childrenKey].length ? 12 : 4"
          >
            <DataNestedGridNode :item="child" :level="level + 1" :children-key="childrenKey">
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
      </VExpansionPanelText>
    </VExpansionPanel>
  </VExpansionPanels>
  <slot v-else name="child-item" :child="item" />
</template>
