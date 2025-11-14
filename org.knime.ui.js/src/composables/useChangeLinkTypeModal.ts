import { computed, ref } from "vue";

import { promise } from "@knime/utils";

import type { LinkType, TemplateLink } from "@/api/gateway-api/generated-api";

type ChangeLinkTypeModalConfig = {
  sourceSpaceId?: string | null;
  selectedSpaceId?: string | null;
  currentLinkType?: TemplateLink["currentLinkType"] | null;
  currentLinkUrl?: string | null;
};

type ChangeLinkTypeResult = LinkType | null;

const isActive = ref(false);
const activeConfig = ref<ChangeLinkTypeModalConfig | null>(null);
const unwrappedPromise = ref(promise.createUnwrappedPromise<ChangeLinkTypeResult>());

const defaults: ChangeLinkTypeModalConfig = {};

export const useChangeLinkTypeModal = () => {
  const promptChangeLinkType = (config: ChangeLinkTypeModalConfig) => {
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

  const confirm = (linkType: LinkType) => {
    unwrappedPromise.value.resolve(linkType);
    close();
  };

  const cancel = () => {
    unwrappedPromise.value.resolve(null);
    close();
  };

  return {
    promptChangeLinkType,
    confirm,
    cancel,
    config: computed(() => activeConfig.value),
    isActive: computed(() => isActive.value),
  };
};
