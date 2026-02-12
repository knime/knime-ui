import { runInEnvironment } from "@/environment";

type Context = {
  jobId: string;
  restAPIBaseURL: string;
};

let __context: Context;

const setContext = (value: Context) => {
  if (__context) {
    consola.error("Context cannot be re-initialized");
    return;
  }

  __context = value;
};

const uiExtensionResource = (path: string, baseUrl?: string): string => {
  consola.trace("Resolving UI Extension resource: ", { path, baseUrl });

  if (import.meta.env.DEV && import.meta.env.VITE_BROWSER_DEV_HTTP_URL) {
    const url = import.meta.env.VITE_BROWSER_DEV_HTTP_URL;
    return `${url}/${path}`;
  }

  return runInEnvironment({
    DESKTOP: () => `${baseUrl}${path}`,

    BROWSER: () => {
      if (!__context) {
        consola.error(
          "[uiExtensionResourceLocation]: Tried to resolve location but context is not initialized",
          { path },
        );
        return "";
      }

      return `${__context.restAPIBaseURL}/jobs/${__context.jobId}/workflow/wizard/web-resources/${path}`;
    },
  });
};

const resourceDownload = (resourceName: string) => {
  return runInEnvironment({
    DESKTOP: () => {
      // TODO: NXT-4494 Not supported for desktop AP
      consola.warn(
        "[resourceDownloadLocation]: Not supported for Desktop AP yet (see NXT-4494)",
        { resourceName },
      );

      return "";
    },

    BROWSER: () => {
      if (!__context) {
        consola.error(
          "[uiExtensionResourceLocation]: Tried to resolve location but context is not initialized",
          { resourceName },
        );
        return "";
      }

      return encodeURI(
        `${__context.restAPIBaseURL}/jobs/${__context.jobId}/output-resources/${resourceName}`,
      );
    },
  });
};

const hintAsset = (url: string) => {
  return runInEnvironment({
    DESKTOP: () => {
      throw new Error(
        "Implementation error: this function is only usable in the BROWSER environment",
      );
    },

    BROWSER: () => {
      if (!__context) {
        consola.error(
          "[uiExtensionResourceLocation]: Tried to resolve location but context is not initialized",
          { url },
        );
        return "";
      }

      const ASSET_PATH = "org/knime/ui/js";
      const withLeadingSlash = url.startsWith("/") ? url : `/${url}`;
      const path = `${ASSET_PATH}${withLeadingSlash}`;
      return `${__context.restAPIBaseURL}/jobs/${__context.jobId}/workflow/wizard/web-resources/${path}`;
    },
  });
};

export const webResourceLocation = {
  setContext,
  uiExtensionResource,
  resourceDownload,
  hintAsset,
};
