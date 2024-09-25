<script setup lang="ts">
import { computed } from "vue";

import type {
  ComponentPortDescription,
  NodeDialogOptionGroup,
  NodePortDescription,
  NodeViewDescription,
} from "@/api/gateway-api/generated-api";

import { NodeFeatureList } from "@knime/components";
import MetadataPortEditor, {
  type PortEditorData,
} from "@/components/workflowMetadata/MetadataPortEditor.vue";
import SidebarPanelSubHeading from "../common/side-panel/SidebarPanelSubHeading.vue";

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
  inPorts: Array<ComponentPortDescription>;
  outPorts: Array<ComponentPortDescription>;

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
  (e: "update:inPorts", value: Array<ComponentPortDescription>): void;
  (e: "update:outPorts", value: Array<ComponentPortDescription>): void;
}>();

const filterPortData = (fullPorts: PortEditorData[]) =>
  fullPorts.map(({ name, description }) => ({
    name,
    description,
  }));
</script>

<template>
  <div v-if="editable" class="node-feature-editor">
    <template v-if="inPorts && inPorts.length > 0">
      <SidebarPanelSubHeading>Input ports</SidebarPanelSubHeading>
      <MetadataPortEditor
        :model-value="fullPortValue.inPorts"
        @update:model-value="emit('update:inPorts', filterPortData($event))"
      />
    </template>
    <template v-if="outPorts && outPorts.length > 0">
      <SidebarPanelSubHeading>Output ports</SidebarPanelSubHeading>
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
@import url("@/assets/mixins.css");

.node-feature-list {
  margin-top: var(--space-16); /* no h2 (that has a margin-top) in this case */

  & :deep(.shadow-wrapper::after),
  & :deep(.shadow-wrapper::before) {
    display: none;
  }

  & :deep(h6) {
    font-size: 13px;
    margin-bottom: 0;
  }

  & :deep(.description) {
    font-size: 13px;
  }

  /* Style refinement for Options */
  & :deep(.options) {
    padding: 20px;

    & .panel {
      padding-left: 0;
      margin-left: 14px;
      font-size: 13px;

      & li > * {
        margin-left: 8px;
        font-size: 13px;
      }

      & .option-field-name {
        margin-bottom: 5px;
        margin-left: 0;
      }

      & .option-description {
        margin-left: 0;
      }
    }
  }

  /* Style refinement for Views */
  & :deep(.views-list) {
    & li {
      padding: 20px;
    }

    & .content {
      margin-top: 5px;
      margin-left: 25px;
    }

    & svg {
      margin-right: 8px;
    }

    & .name {
      font-size: 13px;
    }
  }

  /* Style refinement for Ports */
  & :deep(.ports-list) {
    & .wrapper {
      padding: 20px;
    }

    & h6 {
      font-size: 13px;
      font-weight: 600;
    }

    & .content {
      & ol {
        margin-left: 20px;
        margin-top: 22px;

        & svg {
          @mixin svg-icon-size 9;

          top: 5px;
          left: -17px;
        }

        & .port-type {
          font-size: 13px;
        }

        & .port-name,
        & .port-description {
          margin: 5px 0;
          font-size: 13px;
        }
      }

      & .dyn-ports-description {
        margin-top: 10px;
      }
    }
  }
}
</style>
