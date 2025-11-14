<script lang="ts" setup>
import { InlineMessage, Label } from "@knime/components";
import { KdsCheckbox } from "@knime/kds-components";

import type { ShareComponentCommand } from "@/api/gateway-api/generated-api";

import LinkTypeDropdown from "./LinkTypeDropdown.vue";

defineProps<{
  includeData: boolean;
  selectedSpaceId: string;
  sourceSpaceId: string;
  linkType?: ShareComponentCommand.LinkTypeEnum;
}>();

defineEmits<{
  "update:include-data": [includeData: boolean];
  "update:link-type": [linkType: string];
}>();
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
  <Label #default="{ labelForId }" text="Link type">
    <LinkTypeDropdown
      :id="labelForId"
      :model-value="linkType"
      :selected-space-id="selectedSpaceId"
      :source-space-id="sourceSpaceId"
      @update:model-value="$emit('update:link-type', $event)"
    />
  </Label>
</template>
