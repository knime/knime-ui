import { ref, watch } from "vue";
import { debounce } from "lodash-es";
import { defineStore } from "pinia";

import { resourceLocationResolver } from "@/components/uiExtensions/common/useResourceLocation";
import { isDesktop } from "@/environment";
import { useSelectionStore } from "@/store/selection";
import { useExecutionStore } from "@/store/workflow/execution";

import { pageBuilderApiVuexStoreConfig } from "./pageBuilderStore";
import { showPageBuilderUnsavedChangesDialog } from "./showPageBuilderUnsavedChangesDialog";

export type PageBuilderControl = {
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
  updateAndReexecute: () => Promise<void>;
  unmountShadowApp: () => void;
};

const fallbackCreatePageBuilder: PageBuilderControl = {
  mountShadowApp: () => {
    consola.error("PageBuilder failed to mount. Fallback active.");
    return Promise.resolve();
  },
  loadPage: () => Promise.resolve(),
  isDirty: () => Promise.resolve(false),
  isDefault: () => Promise.resolve(true),
  hasPage: () => false,
  applyToDefaultAndExecute: () => Promise.resolve(),
  updateAndReexecute: () => Promise.resolve(),
  unmountShadowApp: () => {
    consola.error("PageBuilder failed to unmount. Fallback active.");
  },
};

export const useCompositeViewStore = defineStore("component", () => {
  const PageBuilderModule = ref<{ createPageBuilderApp: Function } | null>(
    null,
  );
  const activePageBuilder = ref<PageBuilderControl | null>(null);

  const isCompositeViewDirty = ref(false);
  const isCompositeViewDefault = ref(true);
  const hasPage = ref(false);

  const reexecutingNodes = ref(new Set<string>());

  const DEBOUNCE_DELAY_ON_CHANGE = 100;
  const onPagebuilderStateChange = debounce(
    (isDirty: boolean, isDefault: boolean) => {
      isCompositeViewDirty.value = isDirty;
      isCompositeViewDefault.value = isDefault;
    },
    DEBOUNCE_DELAY_ON_CHANGE,
  );

  const getPageBuilderControl = async (
    projectId: string,
  ): Promise<PageBuilderControl> => {
    const pageBuilderBaseUrl =
      // eslint-disable-next-line no-undefined
      isDesktop() ? "https://org.knime.js.pagebuilder/" : undefined;

    if (PageBuilderModule.value === null) {
      // the pageBuilder module will access the NODE_ENV to determine if it is in development mode
      (window as any).process = { env: { NODE_ENV: import.meta.env.MODE } };

      PageBuilderModule.value = await import(
        resourceLocationResolver(
          projectId,
          "org/knime/core/ui/pagebuilder/shadowAppLib/PageBuilderShadowApp.esm.js",
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
            disallowWebNodes: true,
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
      ) ?? fallbackCreatePageBuilder);

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

    await activePageBuilder.value.updateAndReexecute();
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

  const clickAwayCompositeView = async (): Promise<boolean> => {
    if (activePageBuilder.value === null) {
      return true;
    }

    const isDirty = await activePageBuilder.value.isDirty();
    if (!isDirty) {
      return true;
    }

    return showPageBuilderUnsavedChangesDialog(activePageBuilder.value);
  };

  const isReexecuting = (nodeId: string) => {
    return reexecutingNodes.value.has(nodeId);
  };

  const removeReexecutingNode = (nodeId: string) => {
    if (!isReexecuting(nodeId)) {
      return;
    }
    reexecutingNodes.value.delete(nodeId);
  };

  let isWatcherActive = false;
  const addReexecutingNode = (nodeId: string): "added" | "alreadyExists" => {
    // Watch for changes in the single selected node and remove it from reexecuting nodes if it changes.
    // This is to ensure that we do not keep reexecuting nodes that are no longer selected.

    if (!isWatcherActive) {
      watch(
        () => useSelectionStore().singleSelectedNode,
        (_, oldNode) => {
          if (oldNode) {
            removeReexecutingNode(oldNode?.id);
          }
        },
      );
      isWatcherActive = true;
    }

    if (isReexecuting(nodeId)) {
      return "alreadyExists";
    }
    reexecutingNodes.value.add(nodeId);
    return "added";
  };

  return {
    isCompositeViewDirty,
    isCompositeViewDefault,
    hasPage,

    /*
     * PageBuilder Control: methods to control the PageBuilder.
     *
     *  - `mountShadowApp(shadowRoot: ShadowRoot)`: Mounts the PageBuilder into the provided shadow root.
     *                                              Do not mount the PageBuilder after it was unmounted.
     *  - `loadPage(projectId: string, workflowId: string, nodeId: string)`: Loads a page in the PageBuilder.
     *  - `isDirty()`: Checks if the PageBuilder has unsaved changes.
     *  - `isDefault()`: Checks if the PageBuilder is in its default state.
     *  - `hasPage()`: Checks if the PageBuilder has a page loaded.
     *  - `applyToDefaultAndExecute()`: Applies the current state as default and executes the PageBuilder.
     *                                  Does not check requirements. Use the top level `applyToDefaultAndExecute` function instead.
     *  - `updateAndReexecute()`: Updates the PageBuilder and re-executes it. Does not check requirements.
     *                            Use the top level `applyAndExecute` function instead.
     *  - `unmountShadowApp()`: Unmounts the PageBuilder from the shadow root. Do not mount the PageBuilder after it was unmounted.
     *
     * @returns {PageBuilderControl} The control object for the PageBuilder.
     */
    getPageBuilderControl,
    applyAndExecute,
    applyToDefaultAndExecute,
    resetToDefaults,
    clickAwayCompositeView,

    isReexecuting,
    addReexecutingNode,
    removeReexecutingNode,
  };
});
