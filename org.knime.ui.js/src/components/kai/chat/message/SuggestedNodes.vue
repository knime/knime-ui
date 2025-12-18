<script setup lang="ts">
import { computed, ref } from "vue";

import NodeIcon from "@knime/styles/img/icons/node.svg";

import NodeList from "@/components/common/NodeList/NodeList.vue";
import DraggableNodeTemplate from "@/components/common/NodeTemplate/DraggableNodeTemplate.vue";
import { useAddNodeToWorkflow } from "@/composables/useAddNodeToWorkflow";
import type { NodeTemplateWithExtendedPorts } from "@/util/dataMappers";
import { useKaiExtensionPanel } from "../../useKaiExtensionPanel";

type Props = {
  nodeTemplates: NodeTemplateWithExtendedPorts[];
};

const props = defineProps<Props>();

const { toggleNodeDescription } = useKaiExtensionPanel();
const { addNodeWithAutoPositioning } = useAddNodeToWorkflow();

const hasNodeTemplates = computed(() => props.nodeTemplates.length > 0);

const selectedNode = ref<NodeTemplateWithExtendedPorts | null>(null);

const handleEnterKey = (node: NodeTemplateWithExtendedPorts) => {
  if (node.nodeFactory) {
    addNodeWithAutoPositioning(node.nodeFactory);
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
  margin-top: var(--space-24);

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
    margin-bottom: 0;
  }
}
</style>
