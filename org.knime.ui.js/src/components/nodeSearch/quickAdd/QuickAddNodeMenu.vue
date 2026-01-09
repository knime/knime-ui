<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { SearchInput } from "@knime/components";

import type { AvailablePortTypes, NodeRelation } from "@/api/custom-types";
import {
  AddNodeCommand,
  type NodePort,
  type NodePortTemplate,
} from "@/api/gateway-api/generated-api";
import NodeRepositoryLoader from "@/components/nodeRepository/NodeRepositoryLoader.vue";
import type { QuickActionMenuContext } from "@/components/workflowEditor/CanvasAnchoredComponents/QuickActionMenu/types";
import { useShortcuts } from "@/plugins/shortcuts";
import { useApplicationStore } from "@/store/application/application";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useQuickAddNodesStore } from "@/store/quickAddNodes";
import { useSettingsStore } from "@/store/settings";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import type {
  ExtendedPortType,
  NodeTemplateWithExtendedPorts,
} from "@/util/dataMappers";
import { ports } from "@/util/workflow-canvas";
import { workflowDomain } from "@/util/workflow-domain";

import QuickAddNodeDisabledWorkflowCoach from "./QuickAddNodeDisabledWorkflowCoach.vue";
import QuickAddNodeRecommendations from "./QuickAddNodeRecommendations.vue";
import QuickAddNodeSearchResults from "./QuickAddNodeSearchResults.vue";
import { useNodeRecommendations } from "./useNodeRecommendations";

type Props = {
  quickActionContext: QuickActionMenuContext;
};

const props = defineProps<Props>();

const calculatePortOffset = (params: {
  selectedPort: NodePort;
  templatePorts: (NodePortTemplate & ExtendedPortType)[];
  availablePortTypes: AvailablePortTypes;
  nodeRelation: NodeRelation;
}) => {
  const { selectedPort, templatePorts, availablePortTypes, nodeRelation } =
    params;

  const portIndex = templatePorts.findIndex((templatePort) =>
    workflowDomain.port.checkCompatibility({
      fromPort: nodeRelation === "SUCCESSORS" ? selectedPort : templatePort,
      toPort: nodeRelation === "SUCCESSORS" ? templatePort : selectedPort,
      availablePortTypes,
    }),
  );

  const portCount = templatePorts.length + 1; // +1 for the mickey mouse port
  const positions = ports.positions({
    isOutports: nodeRelation === "PREDECESSORS",
    portCount,
  });

  if (portIndex === -1 && selectedPort.index === 0) {
    // will be a mickey mouse to mickey mouse flow port connection
    // NOTE: the index 0 is always the red mickey mouse port for nodes that
    // are on the workflow, NOT for them in the repo! They lack those ports completely.
    // TODO: fix the inconsistency with NXT-1489
    return positions[0];
  } else {
    return positions[portIndex + 1];
  }
};

const selectedNode = ref<NodeTemplateWithExtendedPorts | null>(null);

const $shortcuts = useShortcuts();

const {
  availablePortTypes,
  nodeRepositoryLoaded,
  nodeRepositoryLoadingProgress,
} = storeToRefs(useApplicationStore());
const { subscribeToNodeRepositoryLoadingEvent } = useLifecycleStore();
const { isWritable } = storeToRefs(useWorkflowStore());
const quickAddNodesStore = useQuickAddNodesStore();
const { searchIsActive, getFirstResult } = storeToRefs(quickAddNodesStore);
const { settings } = useSettingsStore();
const nodeInteractionsStore = useNodeInteractionsStore();

const nodeId = computed(() => props.quickActionContext.nodeId);
const canvasPosition = computed(() => props.quickActionContext.canvasPosition);
const port = computed(() => props.quickActionContext.port);
const nodeRelation = computed(() => props.quickActionContext.nodeRelation);

const displayMode = computed(() => {
  const { nodeRepositoryDisplayMode } = settings;
  if (nodeRepositoryDisplayMode === "tree") {
    return "list";
  }
  return nodeRepositoryDisplayMode;
});

const { hasNodeRecommendationsEnabled, fetchNodeRecommendations } =
  useNodeRecommendations(
    nodeId,
    computed(() => port.value?.index ?? null),
    nodeRelation,
  );

const addNode = async (nodeTemplate: NodeTemplateWithExtendedPorts) => {
  if (!isWritable.value || nodeTemplate === null) {
    return;
  }

  const { nodeFactory, inPorts, outPorts } = nodeTemplate;

  const [offsetX, offsetY] = port.value
    ? calculatePortOffset({
        selectedPort: port.value,
        templatePorts: nodeRelation.value === "SUCCESSORS" ? inPorts : outPorts,
        availablePortTypes: availablePortTypes.value,
        nodeRelation: nodeRelation.value || "SUCCESSORS",
      })
    : [0, 0];

  // add node
  const { x, y } = canvasPosition.value;
  await nodeInteractionsStore.addNode({
    position: {
      x: x - offsetX,
      y: y - offsetY,
    },
    nodeFactory,
    sourceNodeId: nodeId.value!,
    sourcePortIdx: port.value?.index,
    nodeRelation: nodeRelation.value! as AddNodeCommand.NodeRelationEnum,
  });

  props.quickActionContext.closeMenu();
};

const searchEnterKey = () => {
  if (getFirstResult.value) {
    addNode(getFirstResult.value);
  }
};

const recommendationResults =
  ref<InstanceType<typeof QuickAddNodeRecommendations>>();

const searchResults = ref<InstanceType<typeof QuickAddNodeSearchResults>>();

const searchDownKey = () => {
  recommendationResults.value?.focusFirst();
  searchResults.value?.focusFirst();
};

const searchHandleShortcuts = (event: KeyboardEvent) => {
  // shortcuts are disabled on inputs; avoid this behavior for this specific
  // case to allow cycling through ports via the shortcut
  const [shortcut = null] = $shortcuts.findByHotkey(event);
  if (
    shortcut === "openQuickNodeInsertionMenu" &&
    $shortcuts.isEnabled(shortcut)
  ) {
    $shortcuts.dispatch(shortcut);
    event.preventDefault();
    event.stopPropagation();
  }
};

onMounted(() => {
  props.quickActionContext.updateMenuStyle({
    height: "445px",
    anchor: nodeRelation.value === "SUCCESSORS" ? "top-left" : "top-right",
  });

  if (port.value) {
    quickAddNodesStore.setPortTypeId(port.value.typeId);
    quickAddNodesStore.setSearchNodeRelation(nodeRelation.value);
  }

  subscribeToNodeRepositoryLoadingEvent();
});

onBeforeUnmount(() => {
  quickAddNodesStore.clearRecommendedNodesAndSearchParams();
});

watch(port, async (newPort, oldPort) => {
  if (newPort && newPort?.index !== oldPort?.index) {
    // reset search on index switch (this is a common operation via the keyboard shortcut CTRL+.)
    quickAddNodesStore.clearSearchParams();

    // update type id for next search (if one was active it got reset by index change)
    // this needs to be done in all cases as clearSearchParams resets it
    quickAddNodesStore.setPortTypeId(newPort.typeId);
    // also update the node relation, as it will be 'null' otherwise
    quickAddNodesStore.setSearchNodeRelation(nodeRelation.value);

    // fetch new recommendations
    await fetchNodeRecommendations();
  }
});
</script>

<template>
  <div class="header">
    <SearchInput
      ref="search"
      :disabled="!nodeRepositoryLoaded"
      :model-value="quickAddNodesStore.query"
      placeholder="Search compatible nodes"
      class="search-bar"
      focus-on-mount
      tabindex="0"
      @update:model-value="quickAddNodesStore.updateQuery($event)"
      @focusin="selectedNode = null"
      @keydown.enter.prevent.stop="searchEnterKey"
      @keydown.down.prevent.stop="searchDownKey"
      @keydown="searchHandleShortcuts"
    />
  </div>
  <hr />
  <template v-if="nodeRepositoryLoaded">
    <QuickAddNodeDisabledWorkflowCoach
      v-if="!hasNodeRecommendationsEnabled && !searchIsActive"
    />
    <template v-else>
      <QuickAddNodeSearchResults
        v-if="searchIsActive"
        ref="searchResults"
        v-model:selected-node="selectedNode"
        :display-mode="displayMode"
        @nav-reached-top="($refs.search as any).focus()"
        @add-node="addNode($event)"
      />
      <QuickAddNodeRecommendations
        v-else
        ref="recommendationResults"
        v-model:selected-node="selectedNode"
        :display-mode="displayMode"
        @nav-reached-top="($refs.search as any).focus()"
        @add-node="addNode($event)"
      />
    </template>
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

& hr {
  border: none;
  border-top: 1px solid var(--knime-silver-sand);
  margin: 0;
}

& .header {
  padding: 10px;
  flex: none;
}

& :deep(.filtered-nodes-wrapper) {
  border-top: none;
}
</style>
