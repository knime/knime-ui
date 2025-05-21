import { ref } from "vue";
import { debounce } from "lodash-es";

import { resourceLocationResolver } from "@/components/uiExtensions/common/useResourceLocation";
import { isDesktop } from "@/environment";
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

let PageBuilder: {
  createPageBuilderApp: (
    apiStoreConfig: any,
    resourceBaseUrl: string,
  ) => Promise<PageBuilderControl>;
} | null = null;

let activePageBuilder: PageBuilderControl | null = null;

export const isComponentViewDirty = async () =>
  (await activePageBuilder?.isDirty()) ?? false;

export const applyAndExecute = async (): Promise<void> => {
  if (activePageBuilder === null) {
    consola.debug("applyAndExecute: PageBuilder not mounted");
    return;
  }

  const isDirty = await activePageBuilder.isDirty();
  if (!isDirty) {
    consola.debug("applyAndExecute: PageBuilder not dirty");
    return;
  }

  if (!activePageBuilder.hasPage()) {
    consola.debug("applyAndExecute: PageBuilder has no page");
    return;
  }

  await activePageBuilder.updateAndReexecute();
};

export const applyToDefaultAndExecute = async (
  componentNodeId: string,
): Promise<void> => {
  if (!activePageBuilder?.hasPage()) {
    consola.debug(
      "applyToDefaultAndExecute: PageBuilder not mounted or has no page.",
    );
    return;
  }
  await activePageBuilder.applyToDefaultAndExecute();

  await useExecutionStore().executeNodes([componentNodeId]);
};

export const resetToDefaults = async (
  componentNodeId: string,
): Promise<void> => {
  if (activePageBuilder === null) {
    return;
  }

  await useExecutionStore().changeNodeState({
    action: "reset",
    nodes: [componentNodeId],
  });
  await useExecutionStore().executeNodes([componentNodeId]);
};

export const clickAwayCompositeView = async (): Promise<boolean> => {
  if (activePageBuilder === null) {
    return true;
  }

  const isDirty = await activePageBuilder.isDirty();
  if (!isDirty) {
    return true;
  }

  return showPageBuilderUnsavedChangesDialog(activePageBuilder);
};

export const isCompositeViewDirty = ref(false);
export const isCompositeViewDefault = ref(true);

const DEBOUNCE_DELAY_ON_CHANGE = 100;
const onChangeGlobally = debounce((isDirty: boolean, isDefault: boolean) => {
  isCompositeViewDirty.value = isDirty;
  isCompositeViewDefault.value = isDefault;
}, DEBOUNCE_DELAY_ON_CHANGE);

/**
 * Load and initialize the PageBuilder and return a function to mount a shadow app on a given shadowRoot.
 * @param projectId The project ID. when using KNIME in browser the resolution of the PageBuilder module will be done using this project ID. This is not needed when using KNIME in desktop.
 * @param onChange A callback function that will be called when any change is made in the PageBuilder. Will provide a boolean value indicating if the PageBuilder is dirty.
 */
export const usePageBuilder = async (
  projectId: string,
): Promise<PageBuilderControl> => {
  const pageBuilderBaseUrl =
    // eslint-disable-next-line no-undefined
    isDesktop() ? "https://org.knime.js.pagebuilder/" : undefined;

  if (PageBuilder === null) {
    // the pageBuilder module will access the NODE_ENV to determine if it is in development mode
    (window as any).process = { env: { NODE_ENV: import.meta.env.MODE } };

    PageBuilder = await import(
      /* @vite-ignore */ resourceLocationResolver(
        projectId,
        "org/knime/core/ui/pagebuilder/shadowAppLib/PageBuilderShadowApp.esm.js",
        pageBuilderBaseUrl,
      )
    );
  }

  const createdPageBuilder = await (PageBuilder?.createPageBuilderApp(
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
          onChangeGlobally(isDirty, isDefault),
      },
    },
    resourceLocationResolver(projectId, "", pageBuilderBaseUrl),
  ) ?? fallbackCreatePageBuilder);

  const pageBuilderUnmount = createdPageBuilder.unmountShadowApp;
  const pageBuilderMount = createdPageBuilder.mountShadowApp;
  activePageBuilder = {
    ...createdPageBuilder,
    mountShadowApp: async (shadowRoot: ShadowRoot) => {
      await pageBuilderMount(shadowRoot);
      isCompositeViewDirty.value = false;
      isCompositeViewDefault.value =
        (await activePageBuilder?.isDefault()) ?? true;
    },
    unmountShadowApp() {
      activePageBuilder = null;
      pageBuilderUnmount();
    },
  };

  return activePageBuilder;
};
