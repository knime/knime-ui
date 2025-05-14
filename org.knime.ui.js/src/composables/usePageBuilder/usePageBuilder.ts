import { resourceLocationResolver } from "@/components/uiExtensions/common/useResourceLocation";
import { isBrowser, isDesktop } from "@/environment";

import { promptConfirmationAndApply } from "./pageBuilderPromptApply";
import { pageBuilderApiVuexStoreConfig } from "./pageBuilderStore";

export type PageBuilderControl = {
  mountShadowApp: (shadowRoot: ShadowRoot) => void;
  loadPage: (
    projectId: string,
    workflowId: string,
    nodeId: string,
  ) => Promise<void>;
  isDirty: () => Promise<boolean>;
  hasPage: () => boolean;
  updateAndReexecute: () => Promise<void>;
  unmountShadowApp: () => void;
};

const errop = () => {
  consola.error("PageBuilder failed to un/mount. Fallback active.");
};
const fallbackCreatePageBuilder: PageBuilderControl = {
  mountShadowApp: errop,
  loadPage: () => Promise.resolve(),
  isDirty: () => Promise.resolve(false),
  hasPage: () => false,
  updateAndReexecute: () => Promise.resolve(),
  unmountShadowApp: errop,
};

let PageBuilder: {
  createPageBuilderApp: (
    apiStoreConfig: any,
    resourceBaseUrl: string,
  ) => Promise<PageBuilderControl>;
} | null = null;

let activePageBuilder: PageBuilderControl | null = null;

export const clickAwayCompositeView = async (): Promise<boolean> => {
  if (activePageBuilder === null) {
    return true;
  }

  const isDirty = await activePageBuilder.isDirty();
  if (!isDirty) {
    return true;
  }

  return promptConfirmationAndApply(activePageBuilder);
};

/**
 * Load and initialize the PageBuilder and return a function to mount a shadow app on a given shadowRoot.
 * @param projectId The project ID. when using KNIME in browser the resolution of the PageBuilder module will be done using this project ID. This is not needed when using KNIME in desktop.
 * @param onChange A callback function that will be called when any change is made in the PageBuilder. Will provide a boolean value indicating if the PageBuilder is dirty.
 */
export const usePageBuilder = async (
  projectId: string,
  onChange: (isDirty: boolean) => void,
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
        disallowWebNodes: isBrowser(),
        disableWidgetsWhileExecuting: true,
        alwaysTearDownKnimePageBuilderAPI: true,
      },
      actions: {
        ...pageBuilderApiVuexStoreConfig.actions,
        onChange: (_, { isDirty }) => onChange(isDirty),
      },
    },
    resourceLocationResolver(projectId, "", pageBuilderBaseUrl),
  ) ?? fallbackCreatePageBuilder);

  const pageBuilderUnmount = createdPageBuilder.unmountShadowApp;
  activePageBuilder = {
    ...createdPageBuilder,
    unmountShadowApp() {
      activePageBuilder = null;
      pageBuilderUnmount();
    },
  };

  return activePageBuilder;
};
