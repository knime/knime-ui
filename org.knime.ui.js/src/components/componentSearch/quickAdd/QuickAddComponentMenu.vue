<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";

import { SearchInput } from "@knime/components";

import { AddNodeCommand } from "@/api/gateway-api/generated-api";
import NodeRepositoryLoader from "@/components/nodeRepository/NodeRepositoryLoader.vue";
import { NodeTemplate } from "@/components/nodeTemplates";
import type { QuickActionMenuContext } from "@/components/workflowEditor/CanvasAnchoredComponents/QuickActionMenu/types";
import type { NodeTemplateWithExtendedPorts } from "@/lib/data-mappers";
import { useAnalytics } from "@/services/analytics";
import { getToastPresets } from "@/services/toastPresets";
import { useApplicationStore } from "@/store/application/application";
import { useQuickActionComponentSearchStore } from "@/store/componentSearch";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { nodeSize } from "@/style/shapes";
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

const onSearchInputChange = async (searchTerm: string) => {
  try {
    await componentSearchStore.searchByQueryDebounced(searchTerm, {
      onDone: () => {
        useAnalytics().track("node_searched::qam_type_", {
          keyword: searchTerm,
          repoType: "component",
        });
      },
    });
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

const addNode = async (
  nodeTemplate: NodeTemplateWithExtendedPorts,
  action: "click" | "enter",
) => {
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

  const autoConnectOptions =
    nodeId.value && nodeRelation.value && port.value
      ? ({
          mode: "add-autoconnect",
          autoConnectOptions: {
            targetNodeId: nodeId.value,
            targetNodePortIdx: port.value.index,
            nodeRelation: nodeRelation.value as AddNodeCommand.NodeRelationEnum,
          },
        } as const)
      : {};

  await nodeInteractionsStore.addComponentNode({
    position: { x: x - offsetX, y: y - offsetY },
    componentIdInHub: nodeTemplate.id,
    componentName: nodeTemplate.name,
    ...autoConnectOptions,
  });

  const trackId = (
    {
      click: "node_created::qam_click_",
      enter: "node_created::qam_keyboard_enter",
    } as const
  )[action];

  useAnalytics().track(trackId, {
    nodeType: "component",
    nodeHubId: nodeTemplate.id,
  });

  props.quickActionContext.closeMenu();
};

const searchEnterKey = () => {
  if (isLoading.value || !hasLoaded.value || results.value.length === 0) {
    return;
  }

  addNode(results.value[0], "enter");
};

onBeforeUnmount(() => {
  componentSearchStore.clearSearch();
});
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
      @update:model-value="onSearchInputChange"
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
      @on-enter-key="addNode($event, 'enter')"
    >
      <template #nodesTemplate="itemProps">
        <NodeTemplate
          :allow-showing-details="false"
          :draggable="false"
          v-bind="itemProps"
          @click="addNode(itemProps.nodeTemplate, 'click')"
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
