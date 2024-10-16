<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  type Ref,
  ref,
  toRefs,
  watch,
} from "vue";

import { SearchInput } from "@knime/components";

import type {
  AvailablePortTypes,
  ExtendedPortType,
  NodeRelation,
  NodeTemplateWithExtendedPorts,
} from "@/api/custom-types";
import {
  type NodePort,
  type NodePortTemplate,
  type XY,
} from "@/api/gateway-api/generated-api";
import NodeRepositoryLoader from "@/components/nodeRepository/NodeRepositoryLoader.vue";
import { useStore } from "@/composables/useStore";
import { useShortcuts } from "@/plugins/shortcuts";
import { checkPortCompatibility } from "@/util/compatibleConnections";
import { portPositions } from "@/util/portShift";

import QuickAddNodeDisabledWorkflowCoach from "./QuickAddNodeDisabledWorkflowCoach.vue";
import QuickAddNodeRecommendations from "./QuickAddNodeRecommendations.vue";
import QuickAddNodeSearchResults from "./QuickAddNodeSearchResults.vue";
import { useNodeRecommendations } from "./useNodeRecommendations";

export type QuickAddNodeMenuProps = {
  nodeId?: string | null;
  port?: NodePort | null;
  nodeRelation?: NodeRelation | null;
  canvasPosition: Ref<XY>;
  portIndex: Ref<number | null>;
};

const props = withDefaults(defineProps<QuickAddNodeMenuProps>(), {
  nodeId: null,
  port: null,
  nodeRelation: null,
});

const calculatePortOffset = (params: {
  selectedPort: NodePort;
  templatePorts: (NodePortTemplate & ExtendedPortType)[];
  availablePortTypes: AvailablePortTypes;
  nodeRelation: NodeRelation;
}) => {
  const { selectedPort, templatePorts, availablePortTypes, nodeRelation } =
    params;

  const portIndex = templatePorts.findIndex((templatePort) =>
    checkPortCompatibility({
      fromPort: nodeRelation === "SUCCESSORS" ? selectedPort : templatePort,
      toPort: nodeRelation === "SUCCESSORS" ? templatePort : selectedPort,
      availablePortTypes,
    }),
  );

  const portCount = templatePorts.length + 1; // +1 for the mickey mouse port
  const positions = portPositions({
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

const emit = defineEmits(["menuClose"]);

const $shortcuts = useShortcuts();

const store = useStore();

const availablePortTypes = computed(
  () => store.state.application.availablePortTypes,
);
const nodeRepositoryLoaded = computed(
  () => store.state.application.nodeRepositoryLoaded,
);
const nodeRepositoryLoadingProgress = computed(
  () => store.state.application.nodeRepositoryLoadingProgress,
);
const isWritable = computed(() => store.getters["workflow/isWritable"]);
const searchIsActive = computed(
  () => store.getters["quickAddNodes/searchIsActive"],
);
const getFirstResult = computed(
  () => store.getters["quickAddNodes/getFirstResult"],
);

const displayMode = computed(() => {
  const { nodeRepositoryDisplayMode } = store.state.settings.settings;
  if (nodeRepositoryDisplayMode === "tree") {
    return "list";
  }
  return nodeRepositoryDisplayMode;
});

const { canvasPosition, nodeId, portIndex, nodeRelation } = toRefs(props);

const { hasNodeRecommendationsEnabled, fetchNodeRecommendations } =
  useNodeRecommendations(nodeId, portIndex, nodeRelation);

const addNode = async (nodeTemplate: NodeTemplateWithExtendedPorts) => {
  if (!isWritable.value || nodeTemplate === null) {
    return;
  }

  const { nodeFactory, inPorts, outPorts } = nodeTemplate;

  const [offsetX, offsetY] = props.port
    ? calculatePortOffset({
        selectedPort: props.port,
        templatePorts: props.nodeRelation === "SUCCESSORS" ? inPorts : outPorts,
        availablePortTypes: availablePortTypes.value,
        nodeRelation: props.nodeRelation || "SUCCESSORS",
      })
    : [0, 0];

  // add node
  const { x, y } = canvasPosition.value;
  await store.dispatch("workflow/addNode", {
    position: {
      x: x - offsetX,
      y: y - offsetY,
    },
    nodeFactory,
    sourceNodeId: nodeId.value,
    sourcePortIdx: portIndex.value,
    nodeRelation: nodeRelation.value,
  });

  emit("menuClose");
};

const searchEnterKey = () => {
  addNode(getFirstResult.value());
};

const recommendationResults =
  ref<InstanceType<typeof QuickAddNodeRecommendations>>();

const searchResults = ref<InstanceType<typeof QuickAddNodeSearchResults>>();

const searchDownKey = () => {
  recommendationResults.value?.focusFirst();
  searchResults.value?.focusFirst();
};

const searchHandleShortcuts = (e: KeyboardEvent) => {
  // bypass disabled shortcuts for <input> elements only for the quick add node
  let [shortcut = null] = $shortcuts.findByHotkey(e);
  if (shortcut === "quickAddNode" && $shortcuts.isEnabled(shortcut)) {
    $shortcuts.dispatch(shortcut);
    e.preventDefault();
    e.stopPropagation();
  }
};

onMounted(() => {
  if (props.port) {
    store.commit("quickAddNodes/setPortTypeId", props.port.typeId);
    store.commit("quickAddNodes/setSearchNodeRelation", props.nodeRelation);
  }

  store.dispatch("application/subscribeToNodeRepositoryLoadingEvent");
});

onBeforeUnmount(() => {
  store.dispatch("quickAddNodes/clearRecommendedNodesAndSearchParams");
});

watch(
  () => props.port,
  async (newPort, oldPort) => {
    if (newPort && newPort?.index !== oldPort?.index) {
      // reset search on index switch (this is a common operation via the keyboard shortcut CTRL+.)
      await store.dispatch("quickAddNodes/clearSearchParams");
      // update type id for next search (if one was active it got reset by index change)
      // this needs to be done in all cases as clearSearchParams resets it
      store.commit("quickAddNodes/setPortTypeId", newPort.typeId);
      // fetch new recommendations
      await fetchNodeRecommendations();
    }
  },
);
</script>

<template>
  <div class="header">
    <SearchInput
      ref="search"
      :disabled="!nodeRepositoryLoaded"
      :model-value="$store.state.quickAddNodes.query"
      placeholder="Search compatible nodes"
      class="search-bar"
      focus-on-mount
      tabindex="0"
      @update:model-value="$store.dispatch('quickAddNodes/updateQuery', $event)"
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
}

& :deep(.filtered-nodes-wrapper) {
  border-top: none;
}
</style>
