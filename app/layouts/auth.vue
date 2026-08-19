<template>
  <VMain class="auth-main d-flex align-center justify-center pa-4">
    <VCard class="auth-card" max-width="1000" rounded="xl" width="100%">
      <VRow no-gutters>
        <VCol class="auth-aside pa-8 pa-md-12" cols="12" md="5">
          <VAvatar color="white" rounded="lg" size="48" variant="tonal">
            <VIcon icon="mdi-cube-outline" />
          </VAvatar>
          <div class="text-overline font-weight-bold mt-10">ADMIN CONSOLE</div>
          <h1 class="text-h4 font-weight-bold mt-3">Everything your team needs, in one place.</h1>
          <p class="text-body-1 auth-copy mt-5">Manage your workspace, people, and content from a single secure console.</p>

          <div class="auth-benefit mt-10">
            <VIcon icon="mdi-check-circle-outline" size="20" />
            <span>Secure workspace access</span>
          </div>
          <div class="auth-benefit mt-4">
            <VIcon icon="mdi-check-circle-outline" size="20" />
            <span>Simple team management</span>
          </div>
          <div class="auth-benefit mt-4">
            <VIcon icon="mdi-check-circle-outline" size="20" />
            <span>Insights that drive progress</span>
          </div>
        </VCol>

        <VCol class="d-flex align-center pa-6 pa-sm-10" cols="12" md="7">
          <div class="auth-form mx-auto w-100">
            <slot />
          </div>
        </VCol>
      </VRow>
    </VCard>
  </VMain>
</template>

<style scoped>
.auth-main { background: #f6f8fc; min-height: 100vh; }
.auth-card { overflow: hidden; }
.auth-aside { background: linear-gradient(145deg, #4054d6, #6b5bd6); color: white; min-height: 580px; }
.auth-copy { color: rgba(255, 255, 255, 0.78); max-width: 360px; }
.auth-benefit { align-items: center; display: flex; font-size: 0.9375rem; gap: 12px; }
.auth-form { max-width: 400px; }

@media (max-width: 960px) {
  .auth-aside { min-height: auto; }
}
</style>
