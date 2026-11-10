<script setup lang="ts">
const metrics = [
  { label: 'Total users', value: '12,480', change: '+12.5%', icon: 'mdi-account-group-outline', color: 'primary' },
  { label: 'Active sessions', value: '1,842', change: '+8.2%', icon: 'mdi-pulse', color: 'success' },
  { label: 'Completion rate', value: '78.6%', change: '+4.1%', icon: 'mdi-chart-donut-variant', color: 'secondary' },
  { label: 'Open tasks', value: '24', change: '-6.3%', icon: 'mdi-checkbox-marked-circle-outline', color: 'warning' }
]

const chart = [42, 57, 47, 68, 59, 81, 72, 88, 76, 94, 84, 100]

const activity = [
  { title: 'Maya Chen published “Onboarding essentials”', detail: 'Content · 12 minutes ago', icon: 'mdi-file-plus-outline', color: 'primary' },
  { title: 'David Miller joined the Operations team', detail: 'People · 38 minutes ago', icon: 'mdi-account-plus-outline', color: 'success' },
  { title: 'Monthly workspace report is ready', detail: 'Reports · 2 hours ago', icon: 'mdi-chart-box-outline', color: 'secondary' }
]
</script>

<template>
  <section class="dashboard-header mb-8">
    <div>
      <div class="text-overline text-primary font-weight-bold">OVERVIEW</div>
      <h1 class="text-h4 font-weight-bold mt-1">Good morning, Administrator</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">Here’s what’s happening across your workspace today.</p>
    </div>
    <div class="d-flex ga-3">
      <VBtn prepend-icon="mdi-download" variant="outlined">Export</VBtn>
      <VBtn color="primary" prepend-icon="mdi-plus">Create new</VBtn>
    </div>
  </section>

  <VRow>
    <VCol v-for="metric in metrics" :key="metric.label" cols="12" lg="3" sm="6">
      <VCard class="metric-card h-100" rounded="xl" variant="flat">
        <VCardText class="pa-5">
          <div class="d-flex align-start justify-space-between">
            <VAvatar :color="metric.color" rounded="lg" variant="tonal">
              <VIcon :icon="metric.icon" />
            </VAvatar>
            <VChip :color="metric.change.startsWith('-') ? 'error' : 'success'" size="small" variant="tonal">
              {{ metric.change }}
            </VChip>
          </div>
          <div class="text-body-2 text-medium-emphasis mt-6">{{ metric.label }}</div>
          <div class="text-h4 font-weight-bold mt-1">{{ metric.value }}</div>
          <div class="text-caption text-medium-emphasis mt-2">Compared with last month</div>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" lg="8">
      <VCard rounded="xl" variant="flat">
        <VCardItem class="pa-6 pb-2">
          <template #title>Workspace activity</template>
          <template #subtitle>Active users over the last 12 months</template>
          <template #append>
            <VBtn append-icon="mdi-chevron-down" size="small" variant="text">This year</VBtn>
          </template>
        </VCardItem>
        <VCardText class="pa-6 pt-2">
          <div class="chart" aria-label="Workspace activity chart">
            <div v-for="(value, index) in chart" :key="index" class="chart-column">
              <div class="chart-bar" :style="{ height: `${value}%` }" />
              <span>{{ index + 1 }}</span>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" lg="4">
      <VCard class="h-100" rounded="xl" variant="flat">
        <VCardItem class="pa-6">
          <template #title>Team progress</template>
          <template #subtitle>Quarterly priorities</template>
        </VCardItem>
        <VCardText class="pa-6 pt-0">
          <div class="d-flex align-center justify-center py-4">
            <VProgressCircular color="primary" model-value="76" size="150" width="14">
              <div class="text-center">
                <div class="text-h5 font-weight-bold">76%</div>
                <div class="text-caption text-medium-emphasis">complete</div>
              </div>
            </VProgressCircular>
          </div>
          <div class="d-flex justify-space-between text-body-2 mt-4">
            <span class="text-medium-emphasis">Tasks completed</span><strong>76 of 100</strong>
          </div>
          <VProgressLinear class="mt-3" color="primary" height="8" model-value="76" rounded />
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" lg="7">
      <VCard rounded="xl" variant="flat">
        <VCardItem class="pa-6">
          <template #title>Recent activity</template>
          <template #append><VBtn color="primary" size="small" variant="text">View all</VBtn></template>
        </VCardItem>
        <VList class="px-3 pb-4" lines="two">
          <VListItem v-for="item in activity" :key="item.title" :subtitle="item.detail" :title="item.title">
            <template #prepend>
              <VAvatar :color="item.color" class="mr-3" size="40" variant="tonal"><VIcon :icon="item.icon" /></VAvatar>
            </template>
          </VListItem>
        </VList>
      </VCard>
    </VCol>

    <VCol cols="12" lg="5">
      <VCard class="quick-actions h-100" color="primary" rounded="xl" variant="flat">
        <VCardText class="pa-6">
          <VIcon icon="mdi-lightning-bolt-outline" size="32" />
          <div class="text-h6 font-weight-bold mt-5">Keep your workspace moving</div>
          <p class="text-body-2 mt-2">Invite teammates, publish content, or review the latest reports.</p>
          <VBtn class="mt-3" color="white" prepend-icon="mdi-arrow-right" variant="flat">Open quick actions</VBtn>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style scoped>
.dashboard-header { align-items: flex-end; display: flex; justify-content: space-between; }
.metric-card { border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.chart { align-items: end; display: flex; gap: 12px; height: 250px; padding-top: 24px; }
.chart-column { align-items: center; display: flex; flex: 1; flex-direction: column; height: 100%; justify-content: end; min-width: 0; }
.chart-bar { background: linear-gradient(180deg, rgb(var(--v-theme-primary)), rgba(var(--v-theme-primary), 0.28)); border-radius: 8px 8px 3px 3px; max-width: 34px; transition: height 180ms ease; width: 100%; }
.chart-column span { color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); font-size: 0.6875rem; margin-top: 10px; }
.quick-actions { color: rgb(var(--v-theme-on-primary)); }

@media (max-width: 600px) {
  .dashboard-header { align-items: flex-start; flex-direction: column; gap: 20px; }
  .chart { gap: 6px; height: 190px; }
}
</style>
