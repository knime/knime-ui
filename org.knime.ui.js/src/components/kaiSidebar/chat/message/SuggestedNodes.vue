<script setup lang="ts">
import { computed, ref } from "vue";

import NodeIcon from "@knime/styles/img/icons/node.svg";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";
import NodeList from "@/components/nodeRepository/NodeList.vue";
import { useAddNodeToWorkflow } from "@/components/nodeRepository/useAddNodeToWorkflow";
import { useNodeDescriptionPanel } from "../../useNodeDescriptionPanel";

interface Props {
  nodeTemplates: NodeTemplateWithExtendedPorts[];
}

const props = defineProps<Props>();

const { toggleNodeDescription } = useNodeDescriptionPanel();
const addNodeToWorkflow = useAddNodeToWorkflow();

const hasNodeTemplates = computed(() => props.nodeTemplates.length > 0);

const selectedNode = ref<NodeTemplateWithExtendedPorts | null>(null);

const handleEnterKey = (node: NodeTemplateWithExtendedPorts) => {
  if (node.nodeFactory) {
    addNodeToWorkflow({ nodeFactory: node.nodeFactory });
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
        <DraggableNodeTemplate
          v-bind="slotProps"
          @show-node-description="toggleNodeDescription(slotProps)"
        />
      </template>
    </NodeList>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .nodes {
  margin-top: 30px;

  & .title {
    display: flex;
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 10px;

    & svg {
      @mixin svg-icon-size 20;

      margin-top: -1px;
      margin-right: 5px;
    }
  }

  & .node-list {
    margin-left: -5px;
    margin-right: -5px;
  }
}
</style>
