<script setup lang="ts">
import { computed } from "vue";

import { Description } from "@knime/components";

import MetadataDescription from "@/components/workflowMetadata/MetadataDescription.vue";

import type {
  ComponentNodeDescriptionWithExtendedPorts,
  NativeNodeDescriptionWithExtendedPorts,
} from "@/util/portDataMapper";

import { TypedText } from "@/api/gateway-api/generated-api";

type Props = {
  descriptionData:
    | NativeNodeDescriptionWithExtendedPorts
    | ComponentNodeDescriptionWithExtendedPorts;

  isComponent?: boolean;
};

const props = withDefaults(defineProps<Props>(), { isComponent: false });

const isComponentNodeDescription = (
  data:
    | NativeNodeDescriptionWithExtendedPorts
    | ComponentNodeDescriptionWithExtendedPorts,
): data is ComponentNodeDescriptionWithExtendedPorts => {
  return (
    props.isComponent &&
    typeof data.description === "object" &&
    typeof data.description.value === "string"
  );
};

const descriptionText = computed(() => {
  return isComponentNodeDescription(props.descriptionData)
    ? props.descriptionData.description?.value ?? ""
    : props.descriptionData.description ?? "";
});

const isLegacyDescription = computed(() => {
  return isComponentNodeDescription(props.descriptionData)
    ? props.descriptionData.description?.contentType ===
        TypedText.ContentTypeEnum.Plain
    : false;
});
</script>

<template>
  <!-- use the same component as in project metadata to avoid different rendering -->
  <MetadataDescription
    v-if="isComponent"
    :original-description="descriptionText"
    :model-value="descriptionText"
    :is-legacy="isLegacyDescription"
  />

  <Description
    v-else
    class="node-description-html"
    :text="descriptionData.description"
    render-as-html
  />
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .node-description-html {
  font-size: 13px;
  line-height: 150%;

  & :deep(h3) {
    font-size: 13px;
  }

  /* Style refinement for Code */
  & :deep(tt),
  & :deep(pre),
  & :deep(code),
  & :deep(samp) {
    font-size: 11px;
    line-height: 150%;
  }

  /* Style refinement for Tables */
  & :deep(table) {
    width: 100%;
    font-size: 11px;
    border-spacing: 3px 0;
    margin-left: var(--sidebar-panel-padding);

    & th,
    & td {
      padding: 2px 0;
    }
  }
}
</style>
