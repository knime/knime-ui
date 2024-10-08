<script setup lang="ts">
/**
 * A vertical bar holding ports. This is displayed in a metanode workflow to show the metanode's input / output ports.
 */
import { computed, provide } from "vue";

import type { NodePort as NodePortType } from "@/api/gateway-api/generated-api";
import ConnectorSnappingProvider from "@/components/workflow/connectors/ConnectorSnappingProvider.vue";
import { usePortBarPositions } from "@/composables/usePortBarPositions";
import { useStore } from "@/composables/useStore";
import { portSize } from "@/style/shapes";

import NodePort from "./NodePort/NodePort.vue";

interface Props {
  /**
   * A list of port configurations, passed-through to `Port`
   */
  ports: Array<NodePortType>;
  /**
   * Type of port bar. One of `in`/`out`. Defaults to `in`.
   * `in` means the bar containing the metanodes input ports, and vice versa.
   */
  type?: "in" | "out";

  /** Id of the metanode, this PortBar is inside of */
  containerId: string;
}

const {
  portBarXPos,
  portBarYPos,
  portBarHeight,
  portBarWidth,
  getPortBarPortYPosition,
} = usePortBarPositions();

const props = withDefaults(defineProps<Props>(), {
  type: "in",
});

const isOutgoing = computed(() => props.type === "out");

const store = useStore();

const isSelected = computed(() =>
  store.getters["selection/isMetaNodePortBarSelected"](props.type),
);

const position = computed(() => ({
  x: portBarXPos(isOutgoing.value),
  y: portBarYPos(isOutgoing.value),
}));

// Provide position as anchorPoint for tooltips
provide("anchorPoint", position);

const portDirection = computed(() => (isOutgoing.value ? "in" : "out"));

const portPositions = computed(() => {
  const delta = portSize / 2;
  // horizontal center of ports
  const positionX = isOutgoing.value ? -delta : delta;

  // x-coordinate is absolute
  // y-coordinate is relative to PortBar
  const mappedPorts = props.ports.map<[number, number]>((port) => [
    positionX,
    getPortBarPortYPosition(port.index, isOutgoing.value, false),
  ]);

  return {
    in: portDirection.value === "in" ? mappedPorts : [],
    out: portDirection.value === "out" ? mappedPorts : [],
  };
});

const barPosition = computed(() =>
  isOutgoing.value ? 0 : -portBarWidth(isOutgoing.value),
);

const selectBar = () => {
  store.dispatch("selection/selectMetanodePortBar", props.type);
};
</script>

<template>
  <ConnectorSnappingProvider
    :id="containerId"
    :disable-valid-target-check="true"
    :position="position"
    :port-positions="portPositions"
  >
    <template
      #default="{
        targetPort,
        on: {
          onConnectorEnter,
          onConnectorLeave,
          onConnectorMove,
          onConnectorDrop,
        },
      }"
    >
      <g
        :transform="`translate(${position.x}, ${position.y})`"
        @connector-enter.stop="onConnectorEnter"
        @connector-leave.stop="onConnectorLeave"
        @connector-move.stop="
          onConnectorMove($event, {
            inPorts: portDirection === 'in' ? ports : [],
            outPorts: portDirection === 'out' ? ports : [],
          })
        "
        @connector-drop.stop="onConnectorDrop"
      >
        <rect
          class="hover-area"
          :width="
            portBarWidth(isOutgoing) + $shapes.metaNodeBarHorizontalPadding * 2
          "
          :height="portBarHeight(isOutgoing)"
          :x="barPosition - $shapes.metaNodeBarHorizontalPadding"
          data-hide-in-workflow-preview
          @click="selectBar"
        />
        <rect
          class="port-bar"
          :width="portBarWidth(isOutgoing)"
          :height="portBarHeight(isOutgoing)"
          :x="barPosition"
          :fill="$colors.Yellow"
        />
        <rect
          v-if="isSelected"
          class="port-bar-selected"
          :width="
            portBarWidth(isOutgoing) + $shapes.metaNodeBarHorizontalPadding * 2
          "
          :stroke="$colors.Cornflower"
          stroke-width="2"
          rx="2"
          fill="transparent"
          :height="portBarHeight(isOutgoing)"
          :x="barPosition - $shapes.metaNodeBarHorizontalPadding"
        />
        <NodePort
          v-for="port of ports"
          :key="port.index"
          :relative-position="portPositions[portDirection][port.index]"
          :port="port"
          :direction="portDirection"
          :node-id="containerId"
          :targeted="targetPort ? targetPort.index === port.index : false"
          :disable-quick-node-add="true"
        />
      </g>
    </template>
  </ConnectorSnappingProvider>
</template>

<style lang="postcss" scoped>
.hover-area {
  fill: none;
  pointer-events: fill;
}

.port-bar-selected,
.port-bar,
.hover-area {
  cursor: grab;
}
</style>
