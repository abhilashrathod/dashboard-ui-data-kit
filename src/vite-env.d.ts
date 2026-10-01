/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "true" to start the MSW worker in production builds (the deployed demo has no real backend). */
  readonly VITE_ENABLE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
