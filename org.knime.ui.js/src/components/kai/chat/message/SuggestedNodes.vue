<script setup lang="ts">
import { computed, ref } from "vue";

import NodeIcon from "@knime/styles/img/icons/node.svg";

import {
  NodeList,
  NodeTemplate,
  useAddNodeTemplateWithAutoPositioning,
} from "@/components/nodeTemplates";
import type { NodeTemplateWithExtendedPorts } from "@/lib/data-mappers";
import { useAnalytics } from "@/services/analytics";
import { useKaiExtensionPanel } from "../../useKaiExtensionPanel";

type Props = {
  nodeTemplates: NodeTemplateWithExtendedPorts[];
};

const props = defineProps<Props>();

const { toggleNodeDescription } = useKaiExtensionPanel();
const { addNodeWithAutoPositioning } = useAddNodeTemplateWithAutoPositioning();

const hasNodeTemplates = computed(() => props.nodeTemplates.length > 0);

const selectedNode = ref<NodeTemplateWithExtendedPorts | null>(null);

const trackNodeCreation = (
  action: "dragdrop" | "enter",
  nodeTemplate: NodeTemplateWithExtendedPorts,
) => {
  const trackId = (
    {
      dragdrop: "node_created::kaiqa_dragdrop_",
      enter: "node_created::kaiqa_keyboard_enter",
    } as const
  )[action];

  useAnalytics().track({
    id: trackId,
    payload: {
      nodeType: "node",
      nodeFactoryId: nodeTemplate.nodeFactory!.className,
    },
  });
};

const handleEnterKey = (nodeTemplate: NodeTemplateWithExtendedPorts) => {
  if (nodeTemplate.nodeFactory) {
    addNodeWithAutoPositioning(nodeTemplate.nodeFactory);
    trackNodeCreation("enter", nodeTemplate);
  }
};
</script>

<template>
  <div v-if="hasNodeTemplates" class="nodes">
    <div class="title"><NodeIcon /> Nodes</div>
    <NodeList
      v-model:selected-node="selectedNode"
      :nodes="nodeTemplates"
      class="node-list"
      @enter-key="handleEnterKey"
    >
      <template #item="slotProps">
        <NodeTemplate
          v-bind="slotProps"
          @toggle-details="toggleNodeDescription(slotProps)"
          @drag-drop-insert-node="
            trackNodeCreation('dragdrop', $event.template)
          "
        />
      </template>
    </NodeList>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .nodes {
  margin-top: var(--space-24);

  & .title {
    display: flex;
    margin-bottom: 10px;
    font-size: 16px;
    font-weight: 700;

    & svg {
      @mixin svg-icon-size 20;

      margin-top: -1px;
      margin-right: 5px;
    }
  }

  & .node-list {
    margin-right: -5px;
    margin-bottom: 0;
    margin-left: -5px;
  }
}
</style>
