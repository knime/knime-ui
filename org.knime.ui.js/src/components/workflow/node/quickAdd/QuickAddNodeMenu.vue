<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { mapActions, mapGetters, mapState } from "vuex";

import {
  type NodePort,
  type NodePortTemplate,
  type XY,
} from "@/api/gateway-api/generated-api";
import type { DragConnector } from "@/components/workflow/ports/NodePort/types";

import FloatingMenu from "@/components/common/FloatingMenu.vue";
import { SearchInput } from "@knime/components";

import { checkPortCompatibility } from "@/util/compatibleConnections";
import { portPositions } from "@/util/portShift";

import NodePortActiveConnector from "@/components/workflow/ports/NodePort/NodePortActiveConnector.vue";
import QuickAddNodeSearchResults from "./QuickAddNodeSearchResults.vue";
import QuickAddNodeRecommendations from "./QuickAddNodeRecommendations.vue";
import QuickAddNodeDisabledWorkflowCoach from "./QuickAddNodeDisabledWorkflowCoach.vue";
import NodeRepositoryLoader from "@/components/nodeRepository/NodeRepositoryLoader.vue";
import type { SettingsState } from "@/store/settings";
import type {
  AvailablePortTypes,
  ExtendedPortType,
  NodeTemplateWithExtendedPorts,
  NodeRelation,
} from "@/api/custom-types";

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

type ComponentData = {
  selectedNode: NodeTemplateWithExtendedPorts | null;
};

/*
 * Quick Add Node Menu: Shows a menu with recommended nodes that are provided by the api (based on usage statistics).
 * This component fetches, displays and adds them to the workflow.
 */
export default defineComponent({
  components: {
    QuickAddNodeDisabledWorkflowCoach,
    QuickAddNodeRecommendations,
    QuickAddNodeSearchResults,
    SearchInput,
    NodePortActiveConnector,
    FloatingMenu,
    NodeRepositoryLoader,
  },
  props: {
    nodeId: {
      type: [String, null] as PropType<string | null>,
      default: null,
    },
    position: {
      type: Object as PropType<XY>,
      required: true,
    },
    port: {
      type: [Object, null] as PropType<NodePort | null>,
      default: null,
    },
    nodeRelation: {
      type: String as PropType<NodeRelation>,
      default: null,
    },
  },
  emits: ["menuClose"],
  data(): ComponentData {
    return {
      selectedNode: null,
    };
  },
  computed: {
    ...mapState("application", [
      "hasNodeRecommendationsEnabled",
      "availablePortTypes",
      "nodeRepositoryLoaded",
      "nodeRepositoryLoadingProgress",
    ]),
    ...mapState("settings", {
      displayMode: (state: unknown) =>
        (state as SettingsState).settings.nodeRepositoryDisplayMode,
    }),
    ...mapState("canvas", ["zoomFactor"]),
    ...mapState("quickAddNodes", ["recommendedNodes"]),
    ...mapGetters("workflow", ["isWritable", "getNodeById"]),
    ...mapGetters("quickAddNodes", ["searchIsActive", "getFirstResult"]),

    canvasPosition() {
      let pos = { ...this.position };
      const halfPort = this.$shapes.portSize / 2;

      // x: align with the port arrow (position is the center of the port)
      // assume direction == out
      pos.x += halfPort;

      return pos;
    },
    fakePortConnector(): DragConnector {
      // port can be null for the so called global mode
      const portType = this.port
        ? this.availablePortTypes[this.port.typeId]
        : null;
      const flowVariableConnection = portType?.kind === "flowVariable";

      const node =
        this.nodeRelation === "SUCCESSORS" ? "sourceNode" : "destNode";
      const port =
        this.nodeRelation === "SUCCESSORS" ? "sourcePort" : "destPort";

      return {
        id: `quick-add-${this.nodeId}-${this.portIndex}`,
        flowVariableConnection,
        absolutePoint: [this.position.x, this.position.y],
        allowedActions: { canDelete: false },
        interactive: false,
        // eslint-disable-next-line no-undefined
        [node]: this.nodeId ?? undefined,
        // eslint-disable-next-line no-undefined
        [port]: this.portIndex ?? undefined,
      };
    },
    marginTop() {
      const ghostSizeZoomed = this.$shapes.addNodeGhostSize * this.zoomFactor;
      // eslint-disable-next-line no-magic-numbers
      const extraMargin = Math.log(ghostSizeZoomed) / 1.1;
      // eslint-disable-next-line no-magic-numbers
      const marginTop = ghostSizeZoomed / 2 + extraMargin + 3;

      return `${marginTop}px`;
    },
    portIndex() {
      // we need this to be explicit null if no port is given for the api to work
      // falsy will not work as the index can be 0 (which is falsy)
      return this.port ? this.port.index : null;
    },
  },
  watch: {
    hasNodeRecommendationsEnabled: {
      immediate: true,
      handler() {
        if (this.hasNodeRecommendationsEnabled) {
          this.fetchNodeRecommendations();
        }
      },
    },
    async port(newPort, oldPort) {
      if (newPort?.index !== oldPort?.index) {
        // reset search on index switch (this is a common operation via the keyboard shortcut CTRL+.)
        await this.$store.dispatch("quickAddNodes/clearSearchParams");
        // update type id for next search (if one was active it got reset by index change)
        // this needs to be done in all cases as clearSearchParams resets it
        this.$store.commit("quickAddNodes/setPortTypeId", newPort.typeId);
        // fetch new recommendations
        await this.fetchNodeRecommendations();
      }
    },
  },
  mounted() {
    if (this.port) {
      this.$store.commit("quickAddNodes/setPortTypeId", this.port.typeId);
      this.$store.commit(
        "quickAddNodes/setSearchNodeRelation",
        this.nodeRelation,
      );
    }

    this.$store.dispatch("application/subscribeToNodeRepositoryLoadingEvent");
  },
  beforeUnmount() {
    this.$store.dispatch("quickAddNodes/clearRecommendedNodesAndSearchParams");
  },
  methods: {
    ...mapActions("workflow", { addNodeToWorkflow: "addNode" }),
    ...mapActions("quickAddNodes", ["searchNodesNextPage"]),
    async fetchNodeRecommendations() {
      const { nodeId, portIndex: portIdx, nodeRelation } = this;

      await this.$store.dispatch("quickAddNodes/getNodeRecommendations", {
        nodeId,
        portIdx,
        nodeRelation,
      });
    },
    async addNode(nodeTemplate: NodeTemplateWithExtendedPorts) {
      if (!this.isWritable || nodeTemplate === null) {
        return;
      }

      const { nodeFactory, inPorts, outPorts } = nodeTemplate;

      const [offsetX, offsetY] = this.port
        ? calculatePortOffset({
            selectedPort: this.port,
            templatePorts:
              this.nodeRelation === "SUCCESSORS" ? inPorts : outPorts,
            availablePortTypes: this.availablePortTypes,
            nodeRelation: this.nodeRelation,
          })
        : [0, 0];

      // add node
      const {
        canvasPosition: { x, y },
      } = this;
      await this.$store.dispatch("workflow/addNode", {
        position: {
          x: x - offsetX,
          y: y - offsetY,
        },
        nodeFactory,
        sourceNodeId: this.nodeId,
        sourcePortIdx: this.portIndex,
        nodeRelation: this.nodeRelation,
      });

      this.$emit("menuClose");
    },
    searchEnterKey() {
      this.addNode(this.getFirstResult());
    },
    searchDownKey() {
      // @ts-ignore
      this.$refs.recommendationResults?.focusFirst();
      // @ts-ignore
      this.$refs.searchResults?.focusFirst();
    },
    searchHandleShortcuts(e: KeyboardEvent) {
      // bypass disabled shortcuts for <input> elements only for the quick add node
      let [shortcut = null] = this.$shortcuts.findByHotkey(e);
      if (shortcut === "quickAddNode" && this.$shortcuts.isEnabled(shortcut)) {
        this.$shortcuts.dispatch(shortcut);
        e.preventDefault();
        e.stopPropagation();
      }
    },
  },
});
</script>

<template>
  <FloatingMenu
    class="quick-add-node"
    :canvas-position="canvasPosition"
    aria-label="Quick add node"
    focus-trap
    :prevent-overflow="true"
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

  width: 360px;
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
