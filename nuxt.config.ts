// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', 'vuetify-nuxt-module'],
  vite: {
    server: {
      allowedHosts: true
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://klut4stnw2.execute-api.ap-southeast-2.amazonaws.com/v1'
    }
  },
  vuetify: {
    moduleOptions: {
      prefixComposables: ['useLayout']
    }
  }
})
