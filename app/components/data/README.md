# Reusable data views

These components are auto-imported in the Nuxt app:

- `DataTable` wraps `VDataTable` with optional search, loading state, and forwarded table slots. Use `v-model:search` to control its search text and `#header_action` for toolbar actions.
- `DataGrid` displays iterator items in responsive cards. Use `v-model:page`, `items-per-page`, `#item="{ item }"`, and `#header_action`. Iterator slot items keep Vuetify's `{ raw }` wrapper for compatibility with the old grid.
- `DataNestedGrid` renders searchable nested items as expandable panels. Items use a `children` array by default; `children-key` changes that property. Search `selected-attributes`, or leave the list empty to search primitive fields. Slots: `#parent-title="{ parent }"`, `#group-title`/`#group_title="{ child }"`, `#sub_group_title="{ child }"`, `#child-item="{ child }"`, and `#header_action`.
- `DataToggleButton` toggles between list and grid views. Bind with `v-model`, pass an optional `storage-key`, and replace the defaults with an `options` array of `{ value, icon, label? }` objects when needed.

```vue
<DataTable v-model:search="search" :headers="headers" :items="items" :loading="loading">
  <template #item.name="{ item }">
    <NuxtLink :to="`/items/${item.id}`">{{ item.name }}</NuxtLink>
  </template>
  <template #header_action>
    <ButtonsBase color="primary" prepend-icon="mdi-plus">New item</ButtonsBase>
  </template>
</DataTable>
```
