<script lang="ts" setup>
import { Checkbox, InlineMessage } from "@knime/components";

import type { ShareComponentCommand } from "@/api/gateway-api/generated-api";

import LinkTypeDropdown from "./LinkTypeDropdown.vue";

defineProps<{
  selectedSpaceId: string;
  sourceSpaceId: string;
  linkType?: ShareComponentCommand.LinkTypeEnum;
  includeData: boolean;
}>();

defineEmits<{
  "update:link-type": [linkType: string];
  "update:include-data": [includeData: boolean];
}>();
</script>

<template>
  <Checkbox
    :model-value="includeData"
    @update:model-value="$emit('update:include-data', $event)"
  >
    Include input data with component
  </Checkbox>
  <InlineMessage
    v-show="includeData"
    variant="info"
    title="Include input data"
    description="Include input data in a component facilitates their direct editing later on. Please note that upstream nodes need to be executed (or will be executed on save) if input data is to be included. It is advised to keep the input data as small as possible."
  />
  <LinkTypeDropdown
    :model-value="linkType"
    :selected-space-id="selectedSpaceId"
    :source-space-id="sourceSpaceId"
    @update:model-value="$emit('update:link-type', $event)"
  />
</template>
