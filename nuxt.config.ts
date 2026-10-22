// https://nuxt.com/docs/api/configuration/nuxt-config
import { commonjsDeps, commonjsDepsPaths } from '@koumoul/vjsf/utils/build.js'

const apiBase = process.env.NUXT_PUBLIC_API_BASE || 'https://klut4stnw2.execute-api.ap-southeast-2.amazonaws.com/v1'
const apiOrigin = (() => {
  try {
    return new URL(apiBase).origin
  } catch {
    return ''
  }
})()
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "script-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${apiOrigin}`,
].filter(Boolean).join('; ')

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  modules: ['@pinia/nuxt', 'vuetify-nuxt-module'],
  vite: {
    legacy: {
      inconsistentCjsInterop: true,
    },
    optimizeDeps: {
      force: true,
      include: [
        '@koumoul/vjsf',
        '@json-layout/core',
        '@json-layout/vocabulary',
        ...commonjsDeps,
        'ajv-formats/dist/index.js',
        '@json-layout/core > ajv-formats',
        '@json-layout/vocabulary > ajv-formats',
      ],
      needsInterop: [
        'ajv-formats',
        'ajv-formats/dist/index.js',
        '@json-layout/core > ajv-formats',
        '@json-layout/vocabulary > ajv-formats',
      ],
    },
    build: {
      commonjsOptions: {
        include: commonjsDepsPaths,
        transformMixedEsModules: true,
      },
    },
    server: {
      allowedHosts: process.env.NODE_ENV === 'production'
        ? []
        : ['localhost', '127.0.0.1', 'buddhi', 'admin']
    }
  },
  runtimeConfig: {
    public: {
      apiBase
    }
  },
  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy': contentSecurityPolicy,
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Permitted-Cross-Domain-Policies': 'none'
      }
    }
  },
  vuetify: {
    moduleOptions: {
      prefixComposables: ['useLayout']
    }
  }
})
