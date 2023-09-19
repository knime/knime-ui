<script setup lang="ts">
import { computed } from "vue";

import NodePreview from "webapps-common/ui/components/node/NodePreview.vue";
import type {
  AvailablePortTypes,
  ComponentMetadata,
  Workflow,
} from "@/api/custom-types";

import { toExtendedPortObject } from "@/util/portDataMapper";

import MetadataDescription from "./MetadataDescription.vue";
import ComponentMetadataNodeFeatures from "./ComponentMetadataNodeFeatures.vue";

interface Props {
  workflow: Workflow;
  availablePortTypes: AvailablePortTypes;
}

const props = defineProps<Props>();

const componentMetadata = computed<ComponentMetadata>(
  () => props.workflow.componentMetadata,
);
const name = computed(() => componentMetadata.value.name);

const nodePreview = computed(() => {
  const { inPorts = [], outPorts = [], type, icon } = componentMetadata.value;

  return {
    inPorts: inPorts.map(toExtendedPortObject(props.availablePortTypes)),
    outPorts: outPorts.map(toExtendedPortObject(props.availablePortTypes)),
    icon,
    type,
    isComponent: true,
    hasDynPorts: false,
  };
});

const description = computed(() => componentMetadata.value.description);

const nodeFeatures = computed(() => {
  const {
    inPorts = [],
    outPorts = [],
    options,
    views,
  } = componentMetadata.value;

  return {
    inPorts: inPorts.map(toExtendedPortObject(props.availablePortTypes)),
    outPorts: outPorts.map(toExtendedPortObject(props.availablePortTypes)),
    views,
    options,
  };
});
</script>

<template>
  <div>
    <h2 class="component-name">
      <div class="node-preview">
        <NodePreview v-bind="nodePreview" />
      </div>

      <span>{{ name }}</span>
    </h2>
  </div>

  <MetadataDescription
    :original-description="description"
    :model-value="description"
  />

  <ComponentMetadataNodeFeatures :node-features="nodeFeatures" />
</template>

<style lang="postcss" scoped>
h2 {
  margin: 0;
  font-weight: 400;
  font-size: 18px;
  line-height: 36px; /* TODO: NXT-1164 maybe make line height smaller */
}

.component-name {
  display: flex;
  align-items: center;
  margin-bottom: 20px;

  & .node-preview {
    height: 80px;
    width: 80px;
    margin-right: 9px;
    background-color: white;
    flex-shrink: 0;
  }
}
</style>
