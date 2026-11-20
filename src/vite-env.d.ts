/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_USE_MOCK_DATA: string;
  readonly VITE_TELEMETRY_REFRESH_INTERVAL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
