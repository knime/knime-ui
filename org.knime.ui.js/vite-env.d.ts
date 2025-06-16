/// <reference types="@knime/utils/globals.d.ts" />
/// <reference types="@knime/styles/config/svg.d.ts" />
/// <reference types="vite/client" />
/// <reference types="vite-svg-loader" />

// For more info on this env variables see .env.example
interface ImportMetaEnv {
  readonly VITE_APP_PORT: string;
  readonly VITE_LOG_LEVEL: string;

  readonly VITE_BROWSER_DEV_MODE_EMBEDDED: string;
  readonly VITE_BROWSER_DEV_WS_URL: string;
  readonly VITE_BROWSER_DEV_HTTP_URL: string;

  readonly VITE_CANVAS_DEBUG: string;

  readonly VITE_HUB_API_URL: string;
  readonly VITE_HUB_AUTH_USER: string;
  readonly VITE_HUB_AUTH_PASS: string;

  readonly VITE_USE_LOCAL_PAGEBUILDER: string;
  readonly VITE_LOCAL_PAGEBUILDER_RELATIVE_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
