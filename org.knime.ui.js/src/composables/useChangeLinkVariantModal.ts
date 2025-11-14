import { computed, ref } from "vue";

import { promise } from "@knime/utils";

import type {
  LinkVariant,
  LinkVariantInfo,
} from "@/api/gateway-api/generated-api";

type ChangeLinkVariantModalConfig = {
  currentLinkVariant?: LinkVariant.VariantEnum | null;
  linkVariants: LinkVariantInfo[];
};

type ChangeLinkVariantResult = LinkVariant.VariantEnum | null;

const isActive = ref(false);
const activeConfig = ref<ChangeLinkVariantModalConfig | null>(null);
const unwrappedPromise = ref(
  promise.createUnwrappedPromise<ChangeLinkVariantResult>(),
);

const defaults: ChangeLinkVariantModalConfig = {
  linkVariants: [],
};

export const useChangeLinkVariantModal = () => {
  const promptChangeLinkVariant = (config: ChangeLinkVariantModalConfig) => {
    if (isActive.value) {
      unwrappedPromise.value.resolve(null);
      unwrappedPromise.value = promise.createUnwrappedPromise();
    }

    activeConfig.value = { ...defaults, ...config };
    isActive.value = true;
    return unwrappedPromise.value.promise;
  };

  const close = () => {
    isActive.value = false;
    activeConfig.value = null;
    unwrappedPromise.value = promise.createUnwrappedPromise();
  };

  const confirm = (variant: LinkVariant.VariantEnum) => {
    unwrappedPromise.value.resolve(variant);
    close();
  };

  const cancel = () => {
    unwrappedPromise.value.resolve(null);
    close();
  };

  return {
    promptChangeLinkVariant,
    confirm,
    cancel,
    config: computed(() => activeConfig.value),
    isActive: computed(() => isActive.value),
  };
};
