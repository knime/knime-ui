import type { App } from "vue";
import * as Vue from "vue";
import { defineComponent } from "vue";
import { type Store } from "vuex";

import { resourceLocationResolver } from "@/components/uiExtensions/common/useResourceLocation.ts";
import { isDesktop } from "@/environment";
import { pageBuilderStoreConfig } from "@/store/pageBuilderStore.ts";

export const getPageBuilderBaseUrl = () =>
  // eslint-disable-next-line no-undefined
  isDesktop ? "https://org.knime.js.pagebuilder/" : undefined;

const pageBuilderResource = {
  name: "PageBuilder", // module name
  componentName: "PageBuilder", // top level component name

  url: (projectId: string) =>
    resourceLocationResolver(
      projectId,
      "org/knime/core/ui/pagebuilder/lib/PageBuilder.umd.js",
      getPageBuilderBaseUrl(),
    ),
  // dummy vue component to show if loading failed
  fallback: defineComponent({
    template: "<div>PageBuilder failed to load.</div>",
  }),
};

/**
 * Loads the script from the given URL by appending a script tag to the document head.
 * The script element is then removed after successful loading and after error.
 * @param url The script src URL
 * @param backup A backup URL to load a default resource if the intended one fails
 * @returns A promise that is resolved with the script element in case of success, or rejected on error.
 */
const loadScript = (url: string) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true; // this is the default, but let's be safe
    script.addEventListener("load", () => {
      resolve(script);
      document.head.removeChild(script);
    });
    script.addEventListener("error", () => {
      reject(new Error(`Script loading of "${url}" failed`));
      document.head.removeChild(script);
    });
    script.src = url;

    document.head.appendChild(script);
  });
};

const pageBuilderLoader = async (
  store: Store<any>,
  app: App,
  projectId: string,
) => {
  // PageBuilder will access process
  (window as any).process = { env: { NODE_ENV: import.meta.env.MODE } };

  if (app.component(pageBuilderResource.componentName)) {
    return;
  }

  const fallback = (errorMessage: string) => {
    consola.error(
      `Loading of ${
        pageBuilderResource.componentName
      } (url: ${pageBuilderResource.url(
        "<projectId>",
      )}) failed: ${errorMessage}. Will use fallback dummy component.`,
    );
    app.component(
      pageBuilderResource.componentName,
      pageBuilderResource.fallback,
    );
  };

  try {
    await loadScript(pageBuilderResource.url(projectId));

    const Component = (<any>window)[pageBuilderResource.name][
      pageBuilderResource.componentName
    ];

    if (!Component) {
      fallback("PageBuilder component not found.");
      return;
    }

    if (typeof Component.initStore === "function") {
      Component.initStore(store);
      app.component(pageBuilderResource.componentName, Component);
    } else {
      fallback("PageBuilder component does not have initStore method.");
    }

    delete (<any>window)[pageBuilderResource.name];
  } catch (e) {
    fallback((e as unknown as Error).message);
  }
};

/**
 * Setup the PageBuilder store and component in the given Vue app instance. If the store is already initialized, this function will do nothing.
 * @param app The Vue app instance
 * @param store The Vuex store instance to register the PageBuilder store
 * @param projectId The project ID. when using KNIME in browser the resolution of the PageBuilder module will be done using this project ID. This is not needed when using KNIME in desktop.
 */
export const setupPageBuilderEnvironment = async (
  app: App,
  store: Store<any>,
  projectId: string,
): Promise<void> => {
  if (!(window as any).Vue) {
    (window as any).Vue = Vue as any;
  }

  const isStoreInitialized =
    store.hasModule("api") && store.hasModule("pagebuilder");
  if (!isStoreInitialized) {
    consola.info("Loading PageBuilder store and component");
    store.registerModule("api", pageBuilderStoreConfig);

    await pageBuilderLoader(store, app, projectId);

    // old webNodes use this location to load resources
    // eslint-disable-next-line no-undefined
    const resourceBaseUrl = resourceLocationResolver(
      projectId,
      "",
      getPageBuilderBaseUrl(),
    );
    await store.dispatch("pagebuilder/setResourceBaseUrl", {
      resourceBaseUrl,
    });
    store.registerModule("wizardExecution", {
      getters: {
        // eslint-disable-next-line no-undefined
        currentJobId: () => undefined,
      },
      namespaced: true,
    });
  }
};
