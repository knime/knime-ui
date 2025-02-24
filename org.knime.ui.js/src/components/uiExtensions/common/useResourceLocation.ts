import { type Ref, computed } from "vue";
import { storeToRefs } from "pinia";

import { useApplicationStore } from "@/store/application/application";

import type { ExtensionConfig } from "./types";

type UseResourceLocationOptions = {
  extensionConfig: Ref<ExtensionConfig | null>;
};

let restAPIBaseURL = "";

export const resourceLocationResolver = (
  projectId: string,
  path: string,
  baseUrl?: string,
) => {
  consola.trace("resolving dynamic resource: ", { path, baseUrl });

  if (baseUrl) {
    return `${baseUrl}${path}`;
    // eslint-disable-next-line no-negated-condition
  } else if (restAPIBaseURL.length !== 0) {
    return `${restAPIBaseURL}/jobs/${projectId}/workflow/wizard/web-resources/${path}`;
  } else {
    const url =
      import.meta.env.VITE_BROWSER_DEV_HTTP_URL ?? "http://localhost:7000";
    return `${url}/${path}`;
  }
};

export const setRestApiBaseUrl = (url: string) => {
  restAPIBaseURL = url;
};

export const useResourceLocation = (options: UseResourceLocationOptions) => {
  const { activeProjectId } = storeToRefs(useApplicationStore());

  const resourceLocation = computed(() => {
    if (!options.extensionConfig.value || activeProjectId.value === null) {
      return "";
    }

    const { baseUrl, path } = options.extensionConfig.value.resourceInfo;

    return resourceLocationResolver(activeProjectId.value, path ?? "", baseUrl);
  });

  return {
    resourceLocation,
    resourceLocationResolver: (path: string, baseUrl?: string) =>
      resourceLocationResolver(activeProjectId.value ?? "", path, baseUrl),
  };
};
