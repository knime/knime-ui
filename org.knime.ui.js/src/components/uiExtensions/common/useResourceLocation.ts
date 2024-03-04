import { computed, type Ref } from "vue";
import { useStore } from "@/composables/useStore";
import type { ExtensionConfig } from "./types";

type UseResourceLocationOptions = {
  extensionConfig: Ref<ExtensionConfig | null>;
};

let restAPIBaseURL = "";

export const setRestApiBaseUrl = (url: string) => {
  restAPIBaseURL = url;
};

export const useResourceLocation = (options: UseResourceLocationOptions) => {
  const store = useStore();

  const resourceLocationResolver = (path: string, baseUrl?: string) => {
    if (baseUrl) {
      return `${baseUrl}${path}`;
    } else {
      const activeProjectId = store.state.application.activeProjectId;

      return `${restAPIBaseURL}/jobs/${activeProjectId}/workflow/wizard/web-resources/${path}`;
    }
  };

  const resourceLocation = computed(() => {
    if (!options.extensionConfig.value) {
      return "";
    }

    const { baseUrl, path } = options.extensionConfig.value.resourceInfo;

    return resourceLocationResolver(path ?? "", baseUrl);
  });

  return { resourceLocation, resourceLocationResolver };
};
