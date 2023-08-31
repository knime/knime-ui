<script setup lang="ts">
import NodeFeatureList from "webapps-common/ui/components/node/NodeFeatureList.vue";
import type {
  NodeDialogOptionGroup,
  NodePortDescription,
  NodeViewDescription,
} from "@/api/gateway-api/generated-api";
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
  modelValue: NodeFeatures;
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  editable: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", nodeFeatures: NodeFeatures): void;
}>();

const updateField = <K extends keyof NodeFeatures, V = NodeFeatures[K]>(
  property: K,
  value: V,
) => {
  emit("update:modelValue", { ...props.modelValue, [property]: value });
};
</script>

<template>
  <div v-if="editable" class="node-feature-editor">
    <template v-if="modelValue.inPorts && modelValue.inPorts.length > 0">
      <h2>Input ports</h2>
      <hr />
      <MetadataPortEditor
        :model-value="modelValue.inPorts"
        @update:model-value="updateField('inPorts', $event)"
      />
    </template>
    <template v-if="modelValue.outPorts && modelValue.outPorts.length > 0">
      <h2>Output ports</h2>
      <hr />
      <MetadataPortEditor
        :model-value="modelValue.outPorts"
        @update:model-value="updateField('outPorts', $event)"
      />
    </template>
  </div>
  <NodeFeatureList
    v-else
    :in-ports="modelValue.inPorts"
    :dyn-in-ports="modelValue.dynInPorts"
    :out-ports="modelValue.outPorts"
    :dyn-out-ports="modelValue.dynOutPorts"
    :views="modelValue.views"
    :options="modelValue.options"
    sanitize-content
    class="node-feature-list"
  />
</template>

<style lang="postcss" scoped>
.node-feature-editor {
  margin-bottom: 40px;

  & h2 {
    margin: 0;
    font-weight: 400;
    font-size: 18px;
    line-height: 36px;
  }

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
    margin: 0;
  }
}

.node-feature-list {
  margin-bottom: 40px;

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
