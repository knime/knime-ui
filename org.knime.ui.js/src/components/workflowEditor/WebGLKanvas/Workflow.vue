<script setup lang="ts">
import { computed } from "vue";
import type { FederatedPointerEvent } from "pixi.js";
import type { Store } from "vuex";

import type { RootStoreState } from "@/store/types";

import SelectionRectangle from "./SelectionRectangle/SelectionRectangle.vue";
import Connector from "./connectors/Connector.vue";
import Node from "./node/Node.vue";

// TODO: fix store injection
declare let store: Store<RootStoreState>;

const activeWorkflow = computed(() => store.state.workflow.activeWorkflow);

const getNodeIcon = computed(() => store.getters["workflow/getNodeIcon"]);
const getNodeType = computed(() => store.getters["workflow/getNodeType"]);
const globalToWorldCoordinates = computed(
  () => store.getters["canvasWebGL/globalToWorldCoordinates"],
);
const isNodeSelected = computed(
  () => store.getters["selection/isNodeSelected"],
);

const onRightClick = (event: FederatedPointerEvent, nodeId: string) => {
  const [x, y] = globalToWorldCoordinates.value([
    event.global.x,
    event.global.y,
  ]);

  store.commit("canvasWebGL/setCanvasAnchor", {
    isOpen: true,
    anchor: { x, y },
  });

  if (!isNodeSelected.value(nodeId)) {
    store.dispatch("selection/deselectAllObjects");
    store.dispatch("selection/selectNode", nodeId);
  }

  store.dispatch("application/toggleContextMenu");
};
</script>

<template>
  <SelectionRectangle />

  <Node
    v-for="node in activeWorkflow!.nodes"
    :key="node.id"
    :position="node.position"
    :icon="getNodeIcon(node.id)"
    :type="getNodeType(node.id)"
    :node="node"
    @contextmenu="onRightClick($event, node.id)"
  />

  <Connector
    v-for="connector of activeWorkflow!.connections"
    :key="`connector-${connector.sourceNode}-${connector.sourcePort}-${connector.destNode}-${connector.destPort}`"
    v-bind="connector"
  />
</template>
