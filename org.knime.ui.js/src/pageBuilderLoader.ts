import type { App } from "vue";
import * as Vue from "vue";
import { defineComponent } from "vue";
import { type Store, createStore } from "vuex";

import { pageBuilderStoreConfig } from "@/store/pageBuilderStore.ts";

const pageBuilderResource = {
  name: "PageBuilder", // module name
  componentName: "PageBuilder", // top level component name
  url:
    import.meta.env.PAGEBUILDER_URL ||
    "/org/knime/core/ui/pagebuilder/lib/PageBuilder.umd.js",
  backup: "/lib/PageBuilder.umd.js",
  // dummy vue component to show if loading and backup failed
  fallback: defineComponent({
    template: "<div>PageBuilder failed to load.</div>",
  }),
};

const createScriptTag = (resolve: (value: unknown) => void, url: string) => {
  const script = document.createElement("script");
  script.async = true; // this is the default, but let's be safe
  script.addEventListener("load", () => {
    resolve(script);
    document.head.removeChild(script);
  });
  script.src = url;
  return script;
};

/**
 * Loads the script from the given URL by appending a script tag to the document head.
 * The script element is then removed after successful loading and after error.
 * @param url The script src URL
 * @param backup A backup URL to load a default resource if the intended one fails
 * @returns A promise that is resolved with the script element in case of success, or rejected on error.
 */
const loadScript = (url: string, backup?: string) => {
  return new Promise((resolve, reject) => {
    let script = createScriptTag(resolve, url);
    script.addEventListener("error", () => {
      if (script.src.endsWith(url) && backup) {
        consola.warn("Loading of original resource failed: ", url);
        consola.warn(`Trying backup ${backup}`);
        document.head.removeChild(script);
        script = createScriptTag(resolve, backup);
        script.addEventListener("error", () => {
          reject(
            new Error(`Script loading of backup script "${backup}" failed`),
          );
          document.head.removeChild(script);
        });
        document.head.appendChild(script);
      } else {
        reject(new Error(`Script loading of "${url}" failed`));
        document.head.removeChild(script);
      }
    });
    document.head.appendChild(script);
  });
};

const pageBuilderLoader = (store: Store<any>, app: App) => {
  // @ts-ignore
  window.process = { env: { NODE_ENV: "production" } };

  return new Promise<void>((resolve) => {
    if (app.component(pageBuilderResource.componentName)) {
      resolve();
      return;
    }

    loadScript(pageBuilderResource.url, pageBuilderResource.backup)
      .then(() => {
        const Component = (<any>window)[pageBuilderResource.name][
          pageBuilderResource.componentName
        ];
        if (!Component) {
          throw new Error(
            `${
              pageBuilderResource.componentName
            } script invalid. Could not load the PageBuilder (${JSON.stringify(
              pageBuilderResource,
            )}).`,
          );
        }
        if (typeof Component.initStore === "function") {
          Component.initStore(store);
        } else {
          throw new Error(
            `PageBuilder component does not have initStore method. Resource: ${JSON.stringify(
              pageBuilderResource,
            )}.`,
          );
        }
        app.component(pageBuilderResource.componentName, Component);
        delete (<any>window)[pageBuilderResource.name];
      })
      .catch((e) => {
        consola.error(
          `Loading of ${pageBuilderResource.componentName} failed: ${e.message} Will use fallback dummy component.`,
        );
        app.component(
          pageBuilderResource.componentName,
          pageBuilderResource.fallback,
        );
      })
      .finally(() => {
        resolve();
      });
  });
};

export const setupPageBuilder = async (app: App): Promise<void> => {
  // @ts-ignore
  if (!window.Vue) {
    // @ts-ignore
    window.Vue = Vue as any;
  }

  // PageBuilder will access process
  (window as any).process = { env: { NODE_ENV: import.meta.env.MODE } };

  const store = createStore({
    modules: {
      api: pageBuilderStoreConfig,
    },
  });

  await pageBuilderLoader(store, app);
  app.use(store);

  if (import.meta.env.DEV) {
    (window as any).pagebuilderStore = store;
  }
};
