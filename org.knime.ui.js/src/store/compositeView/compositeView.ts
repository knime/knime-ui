import { ref } from "vue";
import { defineStore } from "pinia";

import { resourceLocationResolver } from "@/components/uiExtensions/common/useResourceLocation";
import { isBrowser, isDesktop } from "@/environment";
import { useExecutionStore } from "@/store/workflow/execution";

import { pageBuilderApiVuexStoreConfig } from "./pageBuilderStore";
import { showPageBuilderUnsavedChangesDialog } from "./showPageBuilderUnsavedChangesDialog";

const PAGEBUILDER_BASE_URL_FOR_DESKTOP = "https://org.knime.js.pagebuilder/";
const PATH_TO_PAGEBUILDER_SHADOW_APP_MODULE =
  "org/knime/core/ui/pagebuilder/shadowAppLib/PageBuilderShadowApp.esm.js";

export type PageBuilderApi = {
  mountShadowApp: (shadowRoot: ShadowRoot) => Promise<void>;
  loadPage: (
    projectId: string,
    workflowId: string,
    nodeId: string,
  ) => Promise<void>;
  isDirty: () => Promise<boolean>;
  isDefault: () => Promise<boolean>;
  hasPage: () => boolean;
  applyToDefaultAndExecute: () => Promise<void>;
  applyAndExecute: () => Promise<void>;
  unmountShadowApp: () => void;
};

const fallbackPageBuilderApi: PageBuilderApi = {
  mountShadowApp: () => {
    consola.error("PageBuilder failed to mount. Fallback active.");
    return Promise.resolve();
  },
  loadPage: () => Promise.resolve(),
  isDirty: () => Promise.resolve(false),
  isDefault: () => Promise.resolve(true),
  hasPage: () => false,
  applyToDefaultAndExecute: () => Promise.resolve(),
  applyAndExecute: () => Promise.resolve(),
  unmountShadowApp: () => {
    consola.error("PageBuilder failed to unmount. Fallback active.");
  },
};

export const useCompositeViewStore = defineStore("component", () => {
  const PageBuilderModule = ref<{ createPageBuilderApp: Function } | null>(
    null,
  );
  const activePageBuilder = ref<PageBuilderApi | null>(null);

  const isCompositeViewDirty = ref(false);
  const isCompositeViewDefault = ref(true);
  const hasPage = ref(false);

  const reexecutingNodes = ref(new Set<string>());

  const onPagebuilderStateChange = (isDirty: boolean, isDefault: boolean) => {
    isCompositeViewDirty.value = isDirty;
    isCompositeViewDefault.value = isDefault;
  };

  const getPageBuilder = async (projectId: string): Promise<PageBuilderApi> => {
    const pageBuilderBaseUrl =
      // eslint-disable-next-line no-undefined
      isDesktop() ? PAGEBUILDER_BASE_URL_FOR_DESKTOP : undefined;

    if (PageBuilderModule.value === null) {
      // the pageBuilder module will access the NODE_ENV to determine if it is in development mode
      (window as any).process = { env: { NODE_ENV: import.meta.env.MODE } };

      PageBuilderModule.value = await import(
        /* @vite-ignore */
        resourceLocationResolver(
          projectId,
          PATH_TO_PAGEBUILDER_SHADOW_APP_MODULE,
          pageBuilderBaseUrl,
        )
      );
    }

    const createdPageBuilder =
      await (PageBuilderModule.value?.createPageBuilderApp(
        {
          ...pageBuilderApiVuexStoreConfig,
          state: {
            ...pageBuilderApiVuexStoreConfig.state,
            disallowLegacyWidgets: true,
            disableWidgetsWhileExecuting: true,
            alwaysTearDownKnimePageBuilderAPI: true,
          },
          actions: {
            ...pageBuilderApiVuexStoreConfig.actions,
            onChange: (_, { isDirty, isDefault }) =>
              onPagebuilderStateChange(isDirty, isDefault),
          },
        },
        resourceLocationResolver(projectId, "", pageBuilderBaseUrl),
      ) ?? fallbackPageBuilderApi);

    activePageBuilder.value = {
      ...createdPageBuilder,
      mountShadowApp: async (shadowRoot: ShadowRoot) => {
        await createdPageBuilder.mountShadowApp(shadowRoot);
        isCompositeViewDirty.value = false;
        isCompositeViewDefault.value =
          (await activePageBuilder.value?.isDefault()) ?? true;
      },
      unmountShadowApp() {
        activePageBuilder.value = null;
        createdPageBuilder.unmountShadowApp();
      },
    };

    return activePageBuilder.value!;
  };

  const applyAndExecute = async (): Promise<void> => {
    if (activePageBuilder.value === null) {
      consola.debug("applyAndExecute: PageBuilder not mounted");
      return;
    }

    const isDirty = await activePageBuilder.value.isDirty();
    if (!isDirty) {
      consola.debug("applyAndExecute: PageBuilder not dirty");
      return;
    }

    if (!activePageBuilder.value.hasPage()) {
      consola.debug("applyAndExecute: PageBuilder has no page");
      return;
    }

    await activePageBuilder.value.applyAndExecute();
  };

  const applyToDefaultAndExecute = async (
    componentNodeId: string,
  ): Promise<void> => {
    if (!activePageBuilder.value?.hasPage()) {
      consola.debug(
        "applyToDefaultAndExecute: PageBuilder not mounted or has no page.",
      );
      return;
    }
    await activePageBuilder.value.applyToDefaultAndExecute();

    await useExecutionStore().executeNodes([componentNodeId]);
  };

  const resetToDefaults = async (componentNodeId: string): Promise<void> => {
    if (activePageBuilder.value === null) {
      consola.debug("resetToDefaults: PageBuilder not mounted");
      return;
    }

    await useExecutionStore().changeNodeState({
      action: "reset",
      nodes: [componentNodeId],
    });
    await useExecutionStore().executeNodes([componentNodeId]);
  };

  /**
   * Tries to apply unsaved changes to a composite view
   *
   * @returns
   */
  const clickAwayCompositeView = async (): Promise<{
    didPrompt: boolean;
    canContinue: boolean;
  }> => {
    if (activePageBuilder.value === null) {
      return { didPrompt: false, canContinue: true };
    }

    const isDirty = await activePageBuilder.value.isDirty();
    if (!isDirty) {
      return { didPrompt: false, canContinue: true };
    }

    if (isBrowser()) {
      await applyAndExecute();
      return { didPrompt: false, canContinue: true };
    }

    const canContinue = await showPageBuilderUnsavedChangesDialog(
      activePageBuilder.value,
    );
    return { didPrompt: true, canContinue };
  };

  const isReexecuting = (nodeId: string) => reexecutingNodes.value.has(nodeId);

  const removeReexecutingNode = (nodeId: string) =>
    reexecutingNodes.value.delete(nodeId);

  const addReexecutingNode = (nodeId: string) =>
    reexecutingNodes.value.add(nodeId);

  return {
    isCompositeViewDirty,
    isCompositeViewDefault,
    hasPage,

    /*
     * Methods to control the PageBuilder app.
     *
     *  - `mountShadowApp(shadowRoot: ShadowRoot)`: Mounts the PageBuilder into the provided shadow root.
     *                                              Do not mount the PageBuilder after it was unmounted.
     *  - `loadPage(projectId: string, workflowId: string, nodeId: string)`: Loads a page in the PageBuilder.
     *  - `isDirty()`: Checks if the PageBuilder has unsaved changes.
     *  - `isDefault()`: Checks if the PageBuilder is in its default state.
     *  - `hasPage()`: Checks if the PageBuilder has a page loaded.
     *  - `applyToDefaultAndExecute()`: Applies the current state as default and executes the PageBuilder.
     *                                  Does not check requirements. Use the top level `applyToDefaultAndExecute` function instead.
     *  - `applyAndExecute()`: Updates the PageBuilder and re-executes it. Does not check requirements.
     *                            Use the top level `applyAndExecute` function instead.
     *  - `unmountShadowApp()`: Unmounts the PageBuilder from the shadow root. Do not mount the PageBuilder after it was unmounted.
     *
     * @returns {PageBuilderApi}.
     */
    getPageBuilder,
    applyAndExecute,
    applyToDefaultAndExecute,
    resetToDefaults,
    clickAwayCompositeView,

    isReexecuting,
    addReexecutingNode,
    removeReexecutingNode,
  };
});
