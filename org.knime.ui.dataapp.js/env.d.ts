/// <reference types="@knime/utils/globals.d.ts" />
/// <reference types="@knime/styles/config/svg.d.ts" />
/// <reference types="vite/client" />
/// <reference types="vite-svg-loader" />

// For more info on this env variables see .env.example
interface ImportMetaEnv {
  readonly KNIME_DEV_LOCAL_EXECUTION_WEBAPP_URL: string;
  readonly KNIME_DEV_LOCAL_PAGEBUILDER_SCRIPT_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
