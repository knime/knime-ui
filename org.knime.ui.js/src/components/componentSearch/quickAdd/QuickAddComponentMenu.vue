<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";

import { SearchInput } from "@knime/components";

import { AddNodeCommand } from "@/api/gateway-api/generated-api";
import NodeRepositoryLoader from "@/components/nodeRepository/NodeRepositoryLoader.vue";
import { NodeTemplate } from "@/components/nodeTemplates";
import type { QuickActionMenuContext } from "@/components/workflowEditor/CanvasAnchoredComponents/QuickActionMenu/types";
import { useApplicationStore } from "@/store/application/application";
import { useQuickActionComponentSearchStore } from "@/store/componentSearch";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { nodeSize } from "@/style/shapes";
import { getToastPresets } from "@/toastPresets";
import type { NodeTemplateWithExtendedPorts } from "@/util/dataMappers";
import ComponentSearchResults from "../ComponentSearchResults.vue";

type Props = {
  quickActionContext: QuickActionMenuContext;
};

const props = defineProps<Props>();

const { toastPresets } = getToastPresets();

const { nodeRepositoryLoaded, nodeRepositoryLoadingProgress } = storeToRefs(
  useApplicationStore(),
);
const componentSearchStore = useQuickActionComponentSearchStore();
const { isLoading, hasLoaded, results, query } =
  storeToRefs(componentSearchStore);

const updateSearchQuery = async (value: string) => {
  try {
    await componentSearchStore.updateQuery(value);
  } catch (error) {
    toastPresets.search.nodeSearch({ error });
  }
};

const componentSearchResults = useTemplateRef("componentSearchResults");
const searchDownKey = () => {
  componentSearchResults.value?.focusFirst();
};

onMounted(() => {
  props.quickActionContext.updateMenuStyle({ height: "445px" });
});

const nodeInteractionsStore = useNodeInteractionsStore();
const canvasPosition = computed(() => props.quickActionContext.canvasPosition);
const nodeId = computed(() => props.quickActionContext.nodeId);
const port = computed(() => props.quickActionContext.port);
const nodeRelation = computed(() => props.quickActionContext.nodeRelation);

const addNode = async (nodeTemplate: NodeTemplateWithExtendedPorts) => {
  if (!nodeTemplate.component) {
    return;
  }

  const { x, y } = canvasPosition.value;

  const offsetX =
    nodeRelation.value === AddNodeCommand.NodeRelationEnum.PREDECESSORS
      ? nodeSize
      : 0;

  // since we can't predict which port the connection will be made to, the placeholder will assume
  // it's the middle port, so we can easily set the Y offset to the vertical middle
  const offsetY = nodeSize / 2;

  await nodeInteractionsStore.addComponentNodeFromMainHub({
    position: { x: x - offsetX, y: y - offsetY },
    componentIdInHub: nodeTemplate.id,
    componentName: nodeTemplate.name,
    autoConnectOptions: {
      sourceNodeId: nodeId.value!,
      sourcePortIdx: port.value?.index,
      nodeRelation: nodeRelation.value! as AddNodeCommand.NodeRelationEnum,
    },
  });

  props.quickActionContext.closeMenu();
};

const searchEnterKey = () => {
  if (isLoading.value || !hasLoaded.value || results.value.length === 0) {
    return;
  }

  addNode(results.value[0]);
};
</script>

<template>
  <div class="header">
    <SearchInput
      ref="search"
      :disabled="!nodeRepositoryLoaded"
      :model-value="query"
      placeholder="Search components in the KNIME Hub"
      class="search-bar"
      focus-on-mount
      tabindex="0"
      @update:model-value="updateSearchQuery"
      @keydown.enter.prevent.stop="searchEnterKey"
      @keydown.down.prevent.stop="searchDownKey"
    />
  </div>

  <template v-if="nodeRepositoryLoaded">
    <ComponentSearchResults
      ref="componentSearchResults"
      :active="true"
      :is-loading="isLoading"
      :has-loaded="hasLoaded"
      :results="results"
      :fetch-data="componentSearchStore.searchComponents"
      @nav-reached-top="($refs.search as any).focus()"
      @add-to-workflow="addNode"
    >
      <template #nodesTemplate="itemProps">
        <NodeTemplate
          v-bind="itemProps"
          @click="addNode(itemProps.nodeTemplate)"
        />
      </template>
    </ComponentSearchResults>
  </template>

  <template v-else>
    <NodeRepositoryLoader
      :progress="nodeRepositoryLoadingProgress?.progress"
      :extension-name="nodeRepositoryLoadingProgress?.extensionName"
    />
  </template>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

&:focus {
  outline: none;
}

& .header {
  padding: 10px;
  flex: none;
  border-bottom: 1px solid var(--knime-silver-sand);
}

& :deep(.filtered-nodes-wrapper) {
  border-top: none;
}
</style>
