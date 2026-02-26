<!-- eslint-disable no-undefined -->
<script lang="ts" setup>
import { ref, watchEffect } from "vue";
import { API } from "@api";

import { InlineMessage, Label } from "@knime/components";
import { KdsCheckbox } from "@knime/kds-components";
import { promise } from "@knime/utils";

import { LinkVariant } from "@/api/gateway-api/generated-api";
import type { LinkVariantInfo } from "@/api/gateway-api/generated-api";
import { getToastPresets } from "@/services/toastPresets";
import { useApplicationStore } from "@/store/application/application";

import LinkVariantDropdown from "./LinkVariantDropdown.vue";

const props = defineProps<{
  includeData: boolean;
  selectedSpaceId: string;
  sourceSpaceId: string;
  selectedSpaceProviderId: string;
  selectedItemId: string;
  linkVariant?: LinkVariant.VariantEnum;
}>();

defineEmits<{
  "update:include-data": [includeData: boolean];
  "update:link-variant": [linkVariant: LinkVariant.VariantEnum];
}>();

const linkVariants = ref<LinkVariantInfo[]>([]);

const fetchLinkVariantsForSelection = (params: {
  sourceSpaceId: string;
  selectedSpaceId: string;
  selectedSpaceProviderId: string;
  selectedItemId: string;
}): Promise<LinkVariantInfo[]> => {
  const { activeProjectId } = useApplicationStore();

  if (!activeProjectId) {
    return Promise.resolve([]);
  }

  return API.space.getLinkVariantsForItem({
    projectId: activeProjectId,
    spaceId: params.selectedSpaceId,
    spaceProviderId: params.selectedSpaceProviderId,
    itemId: params.selectedItemId,
  });
};

const { toastPresets } = getToastPresets();

let __abortController: AbortController | undefined;
watchEffect(() => {
  const {
    sourceSpaceId,
    selectedSpaceId,
    selectedSpaceProviderId,
    selectedItemId,
  } = props;

  if (
    !selectedSpaceId ||
    !selectedSpaceProviderId ||
    !selectedItemId ||
    !sourceSpaceId
  ) {
    linkVariants.value = [];
    return;
  }

  if (__abortController) {
    __abortController.abort({
      selectedSpaceId,
      selectedSpaceProviderId,
      selectedItemId,
      sourceSpaceId,
    });
    __abortController = undefined;
  }

  const { abortController, runAbortablePromise } =
    promise.createAbortablePromise();
  __abortController = abortController;

  runAbortablePromise(async () => {
    try {
      linkVariants.value = await fetchLinkVariantsForSelection({
        sourceSpaceId,
        selectedSpaceId,
        selectedSpaceProviderId,
        selectedItemId,
      });
    } catch (error) {
      if (error instanceof promise.AbortError) {
        consola.info(
          "fetchLinkVariantsForSelection Aborted for:",
          error.message,
        );
        return;
      }

      toastPresets.workflow.component.fetchLinkVariantsFailed({ error });
      linkVariants.value = [];
    }
  });
});
</script>

<template>
  <KdsCheckbox
    :model-value="includeData"
    label="Include input data"
    @update:model-value="$emit('update:include-data', $event === true)"
  />
  <InlineMessage
    v-show="includeData"
    variant="info"
    title="Include input data"
    description="Including input data in a component allows direct editing later. Upstream nodes must be executed (or will run on save) if data is included. Keep the included data as small as possible."
  />
  <Label #default="{ labelForId }" text="Link variant">
    <LinkVariantDropdown
      :id="labelForId"
      :model-value="linkVariant"
      :selected-space-id="selectedSpaceId"
      :link-variants="linkVariants"
      @update:model-value="$emit('update:link-variant', $event)"
    />
  </Label>
</template>
