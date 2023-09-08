<script setup lang="ts">
import { computed } from "vue";

import type {
  NodeDialogOptionGroup,
  NodePortDescription,
  NodeViewDescription,
} from "@/api/gateway-api/generated-api";

import NodeFeatureList from "webapps-common/ui/components/node/NodeFeatureList.vue";
import MetadataPortEditor from "@/components/workflowMetadata/MetadataPortEditor.vue";

export interface NodeFeatures {
  options: Array<NodeDialogOptionGroup>;
  views: Array<NodeViewDescription>;
  inPorts: Array<NodePortDescription>;
  dynInPorts?: Array<NodePortDescription>;
  outPorts: Array<NodePortDescription>;
  dynOutPorts?: Array<NodePortDescription>;
}

interface Props {
  // actual editable data
  inPorts: Array<{ name: string; description: string }>;
  outPorts: Array<{ name: string; description: string }>;

  // all metadata
  nodeFeatures: NodeFeatures;
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  editable: false,
});

// join together editable data (might be changed) with non-editable metadata
const fullPortValue = computed(() => {
  return {
    inPorts: props.nodeFeatures.inPorts.map((port, index) => ({
      ...port,
      ...props.inPorts[index],
    })),
    outPorts: props.nodeFeatures.outPorts.map((port, index) => ({
      ...port,
      ...props.outPorts[index],
    })),
  };
});

const emit = defineEmits<{
  (
    e: "update:inPorts",
    value: Array<{ name: string; description: string }>,
  ): void;
  (
    e: "update:outPorts",
    value: Array<{ name: string; description: string }>,
  ): void;
}>();

const filterPortData = (fullPorts) =>
  fullPorts.map(({ name, description }) => ({
    name,
    description,
  }));
</script>

<template>
  <div v-if="editable" class="node-feature-editor">
    <template v-if="inPorts && inPorts.length > 0">
      <h2 class="section form">Input ports</h2>
      <MetadataPortEditor
        :model-value="fullPortValue.inPorts"
        @update:model-value="emit('update:inPorts', filterPortData($event))"
      />
    </template>
    <template v-if="outPorts && outPorts.length > 0">
      <h2 class="section form">Output ports</h2>
      <MetadataPortEditor
        :model-value="fullPortValue.outPorts"
        @update:model-value="emit('update:outPorts', filterPortData($event))"
      />
    </template>
  </div>
  <NodeFeatureList
    v-else
    :in-ports="nodeFeatures.inPorts"
    :dyn-in-ports="nodeFeatures.dynInPorts"
    :out-ports="nodeFeatures.outPorts"
    :dyn-out-ports="nodeFeatures.dynOutPorts"
    :views="nodeFeatures.views"
    :options="nodeFeatures.options"
    sanitize-content
    class="node-feature-list"
  />
</template>

<style lang="postcss" scoped>
.node-feature-list {
  margin-top: 20px; /* no h2 in this case */

  & :deep(.shadow-wrapper::after),
  & :deep(.shadow-wrapper::before) {
    display: none;
  }

  & :deep(h6) {
    font-size: 16px;
    margin-bottom: 0;
  }

  & :deep(.description) {
    font-size: 16px;
  }

  /* Style refinement for Options */
  & :deep(.options .panel) {
    padding-left: 0;
    margin-left: 52px;

    & li > * {
      margin-left: 8px;
    }

    & .option-field-name {
      margin-bottom: 5px;
    }
  }

  /* Style refinement for Views */
  & :deep(.views-list) {
    & .content {
      margin-top: 5px;
      margin-left: 30px;
    }

    & svg {
      margin-right: 8px;
    }
  }

  /* Style refinement for Ports */
  & :deep(.ports-list) {
    & .content {
      & ol {
        margin-left: 28px;
        margin-top: 22px;
      }

      & .dyn-ports-description {
        margin-top: 10px;
      }
    }
  }
}
</style>
