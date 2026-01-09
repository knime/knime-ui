<script lang="ts" setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import NodeList from "@/components/common/NodeList/NodeList.vue";
import NodeTemplate from "@/components/common/NodeTemplate/NodeTemplate.vue";
import type { NodeTemplateWithExtendedPorts } from "@/lib/data-mappers";
import { useQuickAddNodesStore } from "@/store/quickAddNodes";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";

type Props = {
  selectedNode: NodeTemplateWithExtendedPorts | null;
  disableRecommendations?: boolean;
  displayMode?: NodeRepositoryDisplayModesType;
};

withDefaults(defineProps<Props>(), {
  disableRecommendations: false,
  displayMode: "icon",
});

defineEmits<{
  "update:selectedNode": [value: NodeTemplateWithExtendedPorts | null];
  addNode: [node: NodeTemplateWithExtendedPorts];
  navReachedTop: [];
}>();

const { recommendedNodes } = storeToRefs(useQuickAddNodesStore());

const hasRecommendations = computed(() => recommendedNodes.value.length > 0);

const recommendationResults = ref<InstanceType<typeof NodeList>>();
const focusFirst = () => recommendationResults.value?.focusFirst();
defineExpose({ focusFirst });
</script>

<template>
  <div class="recommendations">
    <NodeList
      v-if="hasRecommendations"
      ref="recommendationResults"
      :selected-node="selectedNode"
      :nodes="recommendedNodes"
      :display-mode="displayMode"
      :highlight-first="true"
      @nav-reached-top="$emit('navReachedTop')"
      @enter-key="$emit('addNode', $event)"
      @update:selected-node="$emit('update:selectedNode', $event)"
    >
      <template #item="itemProps">
        <NodeTemplate
          v-bind="itemProps"
          @click="$emit('addNode', itemProps.nodeTemplate)"
        />
      </template>
    </NodeList>
    <span v-else-if="disableRecommendations" class="no-recommendations-message">
      There are no recommendations.<br />
      Search to add compatible nodes.
    </span>
    <span v-else class="no-recommendations-message">
      The Workflow Coach cannot recommend any nodes to you yet.
    </span>
  </div>
</template>

<style lang="postcss">
.recommendations {
  overflow-y: auto;
  padding: 0 10px 10px;

  & .no-recommendations-message {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-style: italic;
    color: var(--knime-dove-gray);
    flex-direction: column;
    margin-top: 30px;
    margin-bottom: 15px;
  }
}
</style>
