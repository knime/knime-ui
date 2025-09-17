/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Store } from "vuex/types/index.js";

const PAGEBULDER_RESOURCE = {
  name: "PageBuilder", // module name
  componentName: "PageBuilder", // top level component name
  url: import.meta.env.PAGEBUILDER_URL || "org/knime/core/ui/pagebuilder/lib/PageBuilder.umd.js",
  devBuildPath: "lib/PageBuilder.umd.js",
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
          reject(new Error(`Script loading of backup script "${backup}" failed`));
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

const getPagebuilderScriptURL = (
  baseUrl: string,
  jobId: string,
  resource: typeof PAGEBULDER_RESOURCE,
) => {
  if (import.meta.env.DEV) {
    const baseUrl = import.meta.env.KNIME_DEV_LOCAL_PAGEBUILDER_SCRIPT_URL;
    return `${baseUrl}/${resource.devBuildPath}`;
  }

  return `${baseUrl}/jobs/${jobId}/workflow/wizard/web-resources/${resource.url}`;
};

export async function pageBuilderLoader(restApiBaseUrl: string, jobId: string, store: Store<any>) {
  if (!window.VUE_APP || !window.Vue) {
    throw new Error("`Vue` && `VUE_APP` must be defined on the window");
  }

  const app = window.VUE_APP;

  // @ts-expect-error - PageBuilder lib build may contain access to process
  window.process = { env: { NODE_ENV: "production" } };

  const resource = PAGEBULDER_RESOURCE;

  if (app.component(resource.componentName)) {
    return;
  }

  try {
    const scriptUrl = getPagebuilderScriptURL(restApiBaseUrl, jobId, resource);
    consola.debug("Loading pagebuilder from :>> ", scriptUrl);
    await loadScript(scriptUrl);
    const Component = window[resource.name][resource.componentName];
    if (!Component) {
      throw new Error(`${resource.componentName} script invalid`);
    }
    // PageBuilder needs to register with global store
    if (typeof Component.initStore === "function") {
      Component.initStore(store);
    }
    app.component(resource.componentName, Component);
    delete (<any>window)[resource.name];
  } catch (e: any) {
    /* 'job-exec' component checks and handles failed loading. No need to reject Promise. */
    consola.error(`Loading of ${resource.componentName} failed`, e);
  }
}
