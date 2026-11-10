<script setup lang="ts">
import type { PackageDetail, PackageUnit } from '~/stores/packages'
import { displayCourseCode, displayCourseTitle } from '~/utils/course-display'

const route = useRoute()
const packagesApi = usePackagesStore()
const coursesStore = useCoursesStore()
const vjsfDialog = useVjsfFormDialog()
const detail = ref<PackageDetail | null>(null)
const loading = ref(true)
const error = ref('')

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

async function openUnitDialog() {
  const currentPackageId = packageId.value
  await vjsfDialog.showDialog({
    title: 'Create reusable unit',
    loadKey: currentPackageId,
    loadForm: () => packagesApi.newUnitForm(currentPackageId),
    saveForm: async (model: Record<string, unknown>) => {
      const { item } = await packagesApi.createUnit(currentPackageId, {
        code: String(model.code || '').trim(),
        title: String(model.title || '').trim(),
        metadata: model.metadata as Record<string, unknown> | undefined,
        content: model.content as Record<string, unknown> | undefined,
      })
      if (detail.value) detail.value.units.push(item)
      return item
    },
  })
}

async function openCourseDialog() {
  const currentPackageId = packageId.value
  await vjsfDialog.showDialog({
    title: 'Create course',
    loadKey: currentPackageId,
    loadForm: async () => {
      const response = await coursesStore.newForm(currentPackageId)
      const schema = response.vjsf.schema
      return {
        vjsf: {
          schema: {
            ...schema,
            properties: {
              ...schema.properties,
              ...(schema.properties?.package_id ? { package_id: { ...schema.properties.package_id, const: currentPackageId, readOnly: true } } : {}),
            },
          },
          model: { ...response.vjsf.model, package_id: currentPackageId },
        },
      }
    },
    saveForm: async (model: Record<string, unknown>) => {
      const created = await coursesStore.create({
        package_id: currentPackageId,
        ...(model.code ? { code: String(model.code).trim() } : {}),
        ...(model.title ? { title: String(model.title).trim() } : {}),
        ...(model.level !== undefined ? { level: Number(model.level) } : {}),
      })
      if (detail.value) detail.value.courses.push(created)
      return created
    },
  })
}

onMounted(load)
</script>

<template>
  <ButtonsBase class="mb-5" prepend-icon="mdi-arrow-left" to="/packages" variant="text">All packages</ButtonsBase>

  <VProgressLinear v-if="loading" class="mb-5" color="primary" indeterminate />
  <VAlert v-if="error" class="mb-5" color="error" variant="tonal">
    {{ error }} <ButtonsBase size="small" variant="text" @click="load">Retry</ButtonsBase>
  </VAlert>

  <template v-if="detail">
    <section class="page-header mb-8">
      <div>
        <div class="text-overline text-primary font-weight-bold">{{ detail.item.type }}</div>
        <h1 class="text-h4 font-weight-bold mt-1">{{ detail.item.title }}</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">{{ detail.item.code }}<span v-if="detail.item.description"> · {{ detail.item.description }}</span></p>
      </div>
      <div class="d-flex ga-3">
        <ButtonsBase v-if="detail.permissions.create_unit" prepend-icon="mdi-plus" variant="outlined" @click="openUnitDialog">Create unit</ButtonsBase>
        <ButtonsBase v-if="detail.permissions.create_course" color="primary" prepend-icon="mdi-plus" @click="openCourseDialog">Create course</ButtonsBase>
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
            <VListItem v-for="course in detail.courses" :key="course.id" :to="`/courses/${course.id}/dashboard`" :title="displayCourseTitle(course)" :subtitle="displayCourseCode(course)">
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

</template>

<style scoped>
.page-header { align-items: flex-end; display: flex; justify-content: space-between; gap: 20px; }
@media (max-width: 600px) { .page-header { align-items: flex-start; flex-direction: column; } }
</style>
