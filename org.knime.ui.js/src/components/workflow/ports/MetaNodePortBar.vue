<script lang="ts" setup>
/**
 * A vertical bar holding ports. This is displayed in a metanode workflow to show the metanode's input / output ports.
 */
import { computed, provide, toRef } from "vue";

import { usePortBarPositions } from "@/composables/usePortBarPositions";
import ConnectorSnappingProvider from "@/components/workflow/connectors/ConnectorSnappingProvider.vue";
import type {
  XY,
  NodePort as NodePortType,
} from "@/api/gateway-api/generated-api";
import { portSize, metaNodeBarWidth } from "@/style/shapes.mjs";

import NodePort from "./NodePort/NodePort.vue";

interface Props {
  /**
   * The position of the node. Contains of an x and a y parameter
   * The y coordinate is the topmost edge of the bar.
   * The x coordinate is the horizontal coordinate of the bar, at the point where the ports are attached.
   */
  position: XY;
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

const { portBarHeight, getPortbarPortYPosition } = usePortBarPositions();

const props = withDefaults(defineProps<Props>(), {
  type: "in",
});

// Provide position as anchorPoint for tooltips
provide("anchorPoint", toRef(props, "position"));

const portDirection = computed(() => (props.type === "out" ? "in" : "out"));

const portPositions = computed(() => {
  const delta = portSize / 2;
  // horizontal center of ports
  const positionX = props.type === "out" ? -delta : delta;

  // x-coordinate is absolute
  // y-coordinate is relative to PortBar
  const mappedPorts = props.ports.map<[number, number]>((port) => [
    positionX,
    getPortbarPortYPosition(port.index, props.type === "out", false),
  ]);

  return {
    in: portDirection.value === "in" ? mappedPorts : [],
    out: portDirection.value === "out" ? mappedPorts : [],
  };
});

const barPosition = computed(() =>
  props.type === "out" ? 0 : -metaNodeBarWidth,
);
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
            $shapes.metaNodeBarWidth + $shapes.metaNodeBarHorizontalPadding * 2
          "
          :height="portBarHeight(type === 'out')"
          :x="barPosition - $shapes.metaNodeBarHorizontalPadding"
          data-hide-in-workflow-preview
        />
        <rect
          class="port-bar"
          :width="$shapes.metaNodeBarWidth"
          :height="portBarHeight(type === 'out')"
          :x="barPosition"
          :fill="$colors.Yellow"
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
</style>
