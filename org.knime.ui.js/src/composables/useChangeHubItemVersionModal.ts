import { computed, ref } from "vue";

import { promise } from "@knime/utils";

import type {
  ItemVersion,
  NamedItemVersion,
  SpecificVersion,
} from "@/api/gateway-api/generated-api";

type ChangeHubItemVersionModalConfig = {
  currentItemVersion?: ItemVersion | SpecificVersion | null;
  itemVersions: NamedItemVersion[];
};

type ChangeHubItemVersionResult = ItemVersion | SpecificVersion | null;

const isActive = ref(false);
const activeConfig = ref<ChangeHubItemVersionModalConfig | null>(null);
const unwrappedPromise = ref(
  promise.createUnwrappedPromise<ChangeHubItemVersionResult>(),
);

const defaults: ChangeHubItemVersionModalConfig = {
  itemVersions: [],
};

export const useChangeHubItemVersionModal = () => {
  const reset = () => {
    isActive.value = false;
    activeConfig.value = null;
    unwrappedPromise.value = promise.createUnwrappedPromise();
  };

  const promptChangeHubItemVersion = (
    config: ChangeHubItemVersionModalConfig,
  ) => {
    if (isActive.value) {
      unwrappedPromise.value.resolve(null);
      reset();
    }

    activeConfig.value = { ...defaults, ...config };
    isActive.value = true;
    return unwrappedPromise.value.promise;
  };

  const close = () => {
    reset();
  };

  const confirm = (version: ItemVersion | SpecificVersion) => {
    unwrappedPromise.value.resolve(version);
    close();
  };

  const cancel = () => {
    unwrappedPromise.value.resolve(null);
    close();
  };

  return {
    promptChangeHubItemVersion,
    confirm,
    cancel,
    config: computed(() => activeConfig.value),
    isActive: computed(() => isActive.value),
  };
};
