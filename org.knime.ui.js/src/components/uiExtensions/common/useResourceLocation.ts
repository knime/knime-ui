import { computed, type Ref } from "vue";
import { useStore } from "@/composables/useStore";
import type { ExtensionConfig } from "./types";

type UseResourceLocationOptions = {
  extensionConfig: Ref<ExtensionConfig | null>;
};

export const useResourceLocation = (options: UseResourceLocationOptions) => {
  const store = useStore();

  const resourceLocationResolver = (path: string, baseUrl?: string) => {
    // TODO: NXT-1295. Originally caused NXT-1217
    // Remove this unnecessary store getter once the issue in the ticket
    // can be solved in a better way. It is necessary at the moment because the TableView is accessing
    // this store module internally, so if not provided then it would error out in the application
    return store.getters["api/uiExtResourceLocation"]({
      resourceInfo: { path, baseUrl },
    });
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
