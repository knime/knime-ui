import { resourceLocationResolver } from "@/components/uiExtensions/common/useResourceLocation";
import { isDesktop } from "@/environment";

import { pageBuilderApiVuexStoreConfig } from "./pageBuilderStore";

export type PageBuilderControl = {
  mountShadowApp: (shadowRoot: ShadowRoot) => void;
  loadPage: (
    projectId: string,
    workflowId: string,
    nodeId: string,
  ) => Promise<void>;
  unmountShadowApp: () => void;
};

const errop = () => {
  consola.error("PageBuilder failed to un/mount. Fallback active.");
};
const fallbackCreatePageBuilder: PageBuilderControl = {
  mountShadowApp: errop,
  loadPage: () => Promise.resolve(),
  unmountShadowApp: errop,
};

let PageBuilder: {
  createPageBuilderApp: (
    apiStoreConfig: any,
    resourceBaseUrl: string,
  ) => Promise<PageBuilderControl>;
} | null = null;

/**
 * Load and initialize the PageBuilder and return a function to mount a shadow app on a given shadowRoot.
 * If it is already initialized, this function will return the cached shadow app control helper.
 * @param projectId The project ID. when using KNIME in browser the resolution of the PageBuilder module will be done using this project ID. This is not needed when using KNIME in desktop.
 */
export const usePageBuilder = async (
  projectId: string,
): Promise<PageBuilderControl> => {
  const pageBuilderBaseUrl =
    // eslint-disable-next-line no-undefined
    isDesktop ? "https://org.knime.js.pagebuilder/" : undefined;

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

  return (
    PageBuilder?.createPageBuilderApp(
      pageBuilderApiVuexStoreConfig,
      resourceLocationResolver(projectId, "", pageBuilderBaseUrl),
    ) ?? fallbackCreatePageBuilder
  );
};
