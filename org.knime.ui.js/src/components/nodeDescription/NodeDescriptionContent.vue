<script setup lang="ts">
import { computed } from "vue";

import { TypedText } from "@/api/gateway-api/generated-api";
import MetadataDescription from "@/components/workflowMetadata/MetadataDescription.vue";
import type {
  ComponentNodeDescriptionWithExtendedPorts,
  NativeNodeDescriptionWithExtendedPorts,
} from "@/util/dataMappers";

import DescriptionText from "./DescriptionText.vue";

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

  <DescriptionText
    v-else
    class="node-description-html"
    :value="descriptionText"
    render-as-html
  />
</template>
