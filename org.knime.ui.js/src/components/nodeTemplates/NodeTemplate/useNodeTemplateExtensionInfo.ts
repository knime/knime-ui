import { type Ref, computed } from "vue";

import type { NodeTemplateWithExtendedPorts } from "@/lib/data-mappers";

type UseNodeTemplateExtensionInfoOptions = {
  nodeTemplate: Ref<NodeTemplateWithExtendedPorts>;
};

export const useNodeTemplateExtensionInfo = (
  options: UseNodeTemplateExtensionInfoOptions,
) => {
  const { nodeTemplate } = options;

  const tooltip = computed(() => {
    return nodeTemplate.value.extension && nodeTemplate.value.extension.vendor
      ? `\n———\n${nodeTemplate.value.extension.name} \nby “${nodeTemplate.value.extension.vendor.name}”`
      : null;
  });

  const isFromCommunity = computed(() => {
    return Boolean(
      nodeTemplate.value.extension?.vendor &&
        !nodeTemplate.value.extension.vendor.isKNIME,
    );
  });

  const extensionInfo = computed(() => ({
    tooltip: tooltip.value,
    isFromCommunity: isFromCommunity.value,
  }));

  return { extensionInfo };
};
