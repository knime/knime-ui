import { type Ref, computed, onUnmounted, ref, watch } from "vue";

import { webResourceLocation } from "@/webResourceLocation";
import type { ExtensionConfig, UIExtensionLoadingState } from "../common/types";

type UseUIExtensionLifecycleOptions = {
  /**
   * Unique identifier that will be watched to trigger a reload/re-render of this
   * UI extension
   */
  renderKey: Ref<any>;
  /**
   * Function to load the UIExtension configuration. Can optionally return a
   * deactivation function that will be run as a cleanup during teardown
   * @returns
   */
  configLoader: () => Promise<{
    extensionConfig: ExtensionConfig;
    deactivateDataServices?: () => Promise<void>;
  }>;
  /**
   * Callback triggered during the 3 possible load stages when getting a UI Extension
   * configuration: 'loading' | 'ready' | 'error'
   */
  onExtensionLoadingStateChange?: (state: UIExtensionLoadingState) => void;
  /**
   * Callback fired immediately before a new UI Extension is loaded, either due to
   * a "first-time" load or when the render key changes
   */
  onBeforeLoadUIExtension?: () => void;
};

export const useUIExtensionLifecycle = (
  options: UseUIExtensionLifecycleOptions,
) => {
  const {
    renderKey,
    configLoader,
    onExtensionLoadingStateChange,
    onBeforeLoadUIExtension,
  } = options;

  const error = ref<any>(null);
  const extensionConfig = ref<ExtensionConfig | null>(null);
  const isLoadingConfig = ref(false);

  let deactivateDataServicesFn: (() => Promise<any>) | undefined;

  const resourceLocation = computed(() => {
    if (!extensionConfig.value) {
      return "";
    }

    const { baseUrl, path } = extensionConfig.value.resourceInfo;
    return webResourceLocation.uiExtensionResource(path ?? "", baseUrl);
  });

  const getResourceLocation = (path: string) =>
    Promise.resolve(
      webResourceLocation.uiExtensionResource(
        path,
        extensionConfig.value?.resourceInfo?.baseUrl,
      ),
    );

  watch(
    renderKey,
    async (next, prev) => {
      onBeforeLoadUIExtension?.();

      try {
        await deactivateDataServicesFn?.();
      } catch (error) {
        consola.error(
          "UIExtension Lifecycle :: failed deactivating data services of previously loaded UI extension",
          { error, nextRenderKey: next, previousRenderKey: prev },
        );
      }

      error.value = null;
      isLoadingConfig.value = true;

      onExtensionLoadingStateChange?.({
        value: "loading",
        message: "Loading data",
      });

      try {
        const result = await configLoader();
        extensionConfig.value = result.extensionConfig;
        deactivateDataServicesFn = result.deactivateDataServices;

        consola.info("UIExtension Lifecycle :: loaded data for", {
          renderKey: next,
          data: result,
        });

        isLoadingConfig.value = false;

        onExtensionLoadingStateChange?.({ value: "ready" });
      } catch (_error) {
        error.value = _error;
        isLoadingConfig.value = false;

        consola.error("UIExtension Lifecycle :: failed to initialize", {
          error: error.value,
          renderKey,
        });

        onExtensionLoadingStateChange?.({
          value: "error",
          message: (_error as Error).message,
          error: _error,
        });
      }
    },
    { immediate: true },
  );

  onUnmounted(async () => {
    try {
      await deactivateDataServicesFn?.();
    } catch (error) {
      consola.error(
        "UIExtension Lifecycle :: failed deactivating data services during unmount",
        error,
      );
    }
  });

  return {
    extensionConfig,
    isLoadingConfig,
    error,
    resourceLocation,
    getResourceLocation,
  };
};
