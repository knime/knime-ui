<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import {
  type NodePort,
  type NodePortTemplate,
  type XY,
} from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";

import FloatingMenu from "@/components/common/FloatingMenu.vue";
import { SearchInput } from "@knime/components";

import { checkPortCompatibility } from "@/util/compatibleConnections";
import { portPositions } from "@/util/portShift";

import NodePortActiveConnector from "@/components/workflow/ports/NodePort/NodePortActiveConnector.vue";
import QuickAddNodeSearchResults from "./QuickAddNodeSearchResults.vue";
import QuickAddNodeRecommendations from "./QuickAddNodeRecommendations.vue";
import QuickAddNodeDisabledWorkflowCoach from "./QuickAddNodeDisabledWorkflowCoach.vue";
import NodeRepositoryLoader from "@/components/nodeRepository/NodeRepositoryLoader.vue";
import type {
  AvailablePortTypes,
  ExtendedPortType,
  NodeTemplateWithExtendedPorts,
  NodeRelation,
} from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import { useShortcuts } from "@/plugins/shortcuts";
import type { DragConnector } from "../../ports/NodePort/types";

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

export type QuickAddNodeMenuProps = {
  nodeId?: String | null;
  position: XY;
  port?: NodePort | null;
  nodeRelation: NodeRelation;
  shouldDoPositionCorrection: boolean;
};

const props = withDefaults(defineProps<QuickAddNodeMenuProps>(), {
  nodeId: null,
  port: null,
  nodeRelation: "SUCCESSORS",
});

const menuWidth = 360;

const emit = defineEmits(["menuClose"]);

const $shortcuts = useShortcuts();

// --------------------------------------------------------
// Computed properties from store
// --------------------------------------------------------
const store = useStore();
const hasNodeRecommendationsEnabled = computed(
  () => store.state.application.hasNodeRecommendationsEnabled,
);
const availablePortTypes = computed(
  () => store.state.application.availablePortTypes,
);
const nodeRepositoryLoaded = computed(
  () => store.state.application.nodeRepositoryLoaded,
);
const nodeRepositoryLoadingProgress = computed(
  () => store.state.application.nodeRepositoryLoadingProgress,
);
const zoomFactor = computed(() => store.state.canvas.zoomFactor);
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

// --------------------------------------------------------
// Computed properties from props
// --------------------------------------------------------
const canvasPosition = computed(() => {
  let pos = { ...props.position };
  const halfPort = $shapes.portSize / 2;

  // x: align with the port arrow (position is the center of the port)
  if (props.nodeRelation === "PREDECESSORS") {
    pos.x -= menuWidth + halfPort;
  } else {
    pos.x += halfPort;
  }

  return pos;
});

const portIndex = computed(() => {
  // we need this to be explicit null if no port is given for the api to work
  // falsy will not work as the index can be 0 (which is falsy)
  return props.port ? props.port.index : null;
});

const fakePortConnector = computed<DragConnector>(() => {
  // port can be null for the so called global mode
  const portType = props.port ? availablePortTypes[props.port.typeId] : null;
  const flowVariableConnection = portType?.kind === "flowVariable";

  const node = props.nodeRelation === "SUCCESSORS" ? "sourceNode" : "destNode";
  const port = props.nodeRelation === "SUCCESSORS" ? "sourcePort" : "destPort";

  return {
    id: `quick-add-${props.nodeId}-${portIndex.value}`,
    flowVariableConnection,
    absolutePoint: [props.position.x, props.position.y],
    allowedActions: { canDelete: false },
    interactive: false,
    // eslint-disable-next-line no-undefined
    [node]: props.nodeId ?? undefined,
    // eslint-disable-next-line no-undefined
    [port]: portIndex.value ?? undefined,
  };
});

const marginTop = computed(() => {
  const ghostSizeZoomed = $shapes.addNodeGhostSize * zoomFactor.value;
  // eslint-disable-next-line no-magic-numbers
  const extraMargin = Math.log(ghostSizeZoomed) / 1.1;
  // eslint-disable-next-line no-magic-numbers
  const marginTop = ghostSizeZoomed / 2 + extraMargin + 3;

  return `${marginTop}px`;
});

// --------------------------------------------------------
// Methods
// --------------------------------------------------------
const fetchNodeRecommendations = async () => {
  const { nodeId, nodeRelation } = props;

  await store.dispatch("quickAddNodes/getNodeRecommendations", {
    nodeId,
    portIdx: portIndex.value,
    nodeRelation,
  });
};

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
        nodeRelation: props.nodeRelation,
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
    sourceNodeId: props.nodeId,
    sourcePortIdx: portIndex.value,
    nodeRelation: props.nodeRelation,
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

// --------------------------------------------------------
// Lifecycle hooks
// --------------------------------------------------------
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

// --------------------------------------------------------
// Watchers
// --------------------------------------------------------
watch(
  () => hasNodeRecommendationsEnabled.value,
  (newValue) => {
    if (newValue) {
      fetchNodeRecommendations();
    }
  },
  { immediate: true },
);

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
  <FloatingMenu
    class="quick-add-node"
    :canvas-position="canvasPosition"
    aria-label="Quick add node"
    focus-trap
    :prevent-overflow="true"
    :style="{ width: `${menuWidth}px` }"
    @menu-close="$emit('menuClose')"
  >
    <!-- this will be portalled to the canvas -->
    <NodePortActiveConnector
      :port="port"
      :targeted="false"
      :direction="nodeRelation === 'SUCCESSORS' ? 'out' : 'in'"
      :drag-connector="fakePortConnector"
      :did-drag-to-compatible-target="false"
      :disable-quick-node-add="false"
    />
    <div class="wrapper">
      <div class="header">
        <SearchInput
          ref="search"
          :disabled="!nodeRepositoryLoaded"
          :model-value="$store.state.quickAddNodes.query"
          placeholder="Search compatible nodes"
          class="search-bar"
          focus-on-mount
          tabindex="0"
          @update:model-value="
            $store.dispatch('quickAddNodes/updateQuery', $event)
          "
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
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-add-node {
  --quick-add-node-height: 450;
  --quick-add-node-header-height: 73;

  margin-top: v-bind("marginTop");

  & .wrapper {
    height: calc(var(--quick-add-node-height) * 1px);
    box-shadow: var(--shadow-elevation-1);
    background: var(--knime-gray-ultra-light);
    display: flex;
    flex-direction: column;
  }

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
}
</style>
