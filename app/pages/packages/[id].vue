<script setup lang="ts">
import type { PackageDetail, PackageUnit } from '~/composables/usePackagesApi'

const route = useRoute()
const router = useRouter()
const packagesApi = usePackagesApi()
const detail = ref<PackageDetail | null>(null)
const loading = ref(true)
const error = ref('')
const unitDialog = ref(false)
const unitCode = ref('')
const unitTitle = ref('')
const unitSaving = ref(false)
const unitError = ref('')

const packageId = computed(() => String(route.params.id))
const units = computed<PackageUnit[]>(() => detail.value?.units ?? [])

async function load() {
  loading.value = true
  error.value = ''
  try {
    detail.value = await packagesApi.show(packageId.value)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load this package.')
  } finally {
    loading.value = false
  }
}

function openUnitDialog() {
  unitCode.value = ''
  unitTitle.value = ''
  unitError.value = ''
  unitDialog.value = true
}

async function createUnit() {
  if (!unitCode.value.trim() || !unitTitle.value.trim()) {
    unitError.value = 'Enter a unit code and title.'
    return
  }
  unitSaving.value = true
  unitError.value = ''
  try {
    const { item } = await packagesApi.createUnit(packageId.value, detail.value?.item.type || '', {
      code: unitCode.value.trim(),
      title: unitTitle.value.trim(),
    })
    if (detail.value) detail.value.units.push(item)
    unitDialog.value = false
  } catch (cause) {
    unitError.value = getApiErrorMessage(cause, 'Unable to create this unit.')
  } finally {
    unitSaving.value = false
  }
}

onMounted(load)
</script>

<template>
  <VBtn class="mb-5" prepend-icon="mdi-arrow-left" to="/packages" variant="text">All packages</VBtn>

  <VProgressLinear v-if="loading" class="mb-5" color="primary" indeterminate />
  <VAlert v-if="error" class="mb-5" color="error" variant="tonal">
    {{ error }} <VBtn size="small" variant="text" @click="load">Retry</VBtn>
  </VAlert>

  <template v-if="detail">
    <section class="page-header mb-8">
      <div>
        <div class="text-overline text-primary font-weight-bold">{{ detail.item.type }}</div>
        <h1 class="text-h4 font-weight-bold mt-1">{{ detail.item.title }}</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">{{ detail.item.code }}<span v-if="detail.item.description"> · {{ detail.item.description }}</span></p>
      </div>
      <div class="d-flex ga-3">
        <VBtn v-if="detail.permissions.create_unit" prepend-icon="mdi-plus" variant="outlined" @click="openUnitDialog">Create unit</VBtn>
        <VBtn v-if="detail.permissions.create_course" color="primary" prepend-icon="mdi-plus" :to="`/courses/create?package_id=${encodeURIComponent(packageId)}`">Create course</VBtn>
      </div>
    </section>

    <VRow>
      <VCol cols="12" lg="7">
        <VCard rounded="xl" variant="flat">
          <VCardItem class="pa-6 pb-3">
            <template #title>Courses</template>
            <template #subtitle>{{ detail.courses.length }} courses in this package</template>
          </VCardItem>
          <VList v-if="detail.courses.length" lines="two">
            <VListItem v-for="course in detail.courses" :key="course.id" :to="`/courses/${course.id}/dashboard`" :title="course.title" :subtitle="course.code">
              <template #prepend><VAvatar color="primary" rounded="lg" variant="tonal"><VIcon icon="mdi-book-open-page-variant-outline" /></VAvatar></template>
              <template #append><VChip size="small" variant="tonal">{{ course.status || 'new' }}</VChip></template>
            </VListItem>
          </VList>
          <VCardText v-else class="pa-6 text-body-2 text-medium-emphasis">No courses have been added to this package.</VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" lg="5">
        <VCard rounded="xl" variant="flat">
          <VCardItem class="pa-6 pb-3">
            <template #title>Reusable units</template>
            <template #subtitle>{{ units.length }} units available to courses in this package</template>
          </VCardItem>
          <VList v-if="units.length" lines="two">
            <VListItem v-for="unit in units" :key="unit.id" :title="unit.title" :subtitle="unit.code">
              <template #prepend><VAvatar color="success" rounded="lg" variant="tonal"><VIcon icon="mdi-file-document-outline" /></VAvatar></template>
            </VListItem>
          </VList>
          <VCardText v-else class="pa-6 text-body-2 text-medium-emphasis">No reusable units have been added to this package.</VCardText>
        </VCard>
      </VCol>
    </VRow>
  </template>

  <VDialog v-model="unitDialog" max-width="520">
    <VCard rounded="xl">
      <VCardTitle class="pa-6 pb-2">Create reusable unit</VCardTitle>
      <VCardText class="pa-6 pt-2">
        <VAlert v-if="unitError" class="mb-4" color="error" density="compact" variant="tonal">{{ unitError }}</VAlert>
        <VTextField v-model="unitCode" class="mb-3" label="Unit code" required />
        <VTextField v-model="unitTitle" label="Unit title" required />
      </VCardText>
      <VCardActions class="pa-6 pt-0">
        <VSpacer />
        <VBtn :disabled="unitSaving" variant="text" @click="unitDialog = false">Cancel</VBtn>
        <VBtn color="primary" :loading="unitSaving" @click="createUnit">Create unit</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.page-header { align-items: flex-end; display: flex; justify-content: space-between; gap: 20px; }
@media (max-width: 600px) { .page-header { align-items: flex-start; flex-direction: column; } }
</style>
