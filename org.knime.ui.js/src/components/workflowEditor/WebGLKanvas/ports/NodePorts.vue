<script setup lang="ts">
import { computed, ref } from "vue";
import type { ContainerInst } from "@/vue3-pixi";

import {
  Node,
  type NodePort as NodePortType,
  type PortGroup,
  type XY,
} from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import {
  portPositions as _portPositions,
  placeholderPosition,
} from "@/util/portShift";

import NodePort from "./NodePort.vue";
import NodePortActiveConnector from "./NodePortActiveConnector.vue";
import { dragConnector } from "./usePortDragging";

interface Props {
  nodeId: string;
  anchor: XY;
  isEditable: boolean;
  nodeKind: Node.KindEnum;
  inPorts: NodePortType[];
  outPorts: NodePortType[];
  portGroups: PortGroup | null;
}

const props = defineProps<Props>();

const isMetanode = computed(() => props.nodeKind === Node.KindEnum.Metanode);
const isComponent = computed(() => props.nodeKind === Node.KindEnum.Component);

const canAddPort = computed(() => {
  if (!props.isEditable) {
    return { input: false, output: false };
  }

  if (isComponent.value || isMetanode.value) {
    return { input: true, output: true };
  }

  if (props.portGroups) {
    let portGroups = Object.values(props.portGroups);
    return {
      input: portGroups.some((portGroup) => portGroup.canAddInPort),
      output: portGroups.some((portGroup) => portGroup.canAddOutPort),
    };
  }

  // Native node without port groups
  return { input: false, output: false };
});

const portPositions = computed(() => {
  const positions = {
    in: _portPositions({
      portCount: props.inPorts.length,
      isMetanode: props.nodeKind === "metanode",
    }),
    out: _portPositions({
      portCount: props.outPorts.length,
      isMetanode: props.nodeKind === "metanode",
      isOutports: true,
    }),
  };

  // add placeholder positions to enable the drop to a placeholder
  if (canAddPort.value.input) {
    positions.in.push(
      placeholderPosition({
        portCount: props.inPorts.length,
        isMetanode: isMetanode.value,
      }),
    );
  }

  if (canAddPort.value.output) {
    positions.out.push(
      placeholderPosition({
        portCount: props.outPorts.length,
        isMetanode: isMetanode.value,
        isOutport: true,
      }),
    );
  }

  return positions;
});

const isDefaultFlowVariable = (index: number) => {
  return !isMetanode.value && index === 0;
};

const getPortContainerName = (index: number, type: "in" | "out") => {
  const typeName = type === "in" ? "In" : "Out";
  return isDefaultFlowVariable(index)
    ? `${props.nodeId}__defaulFlowVar${typeName}`
    : `${props.nodeId}__out-${index}`;
};

const ports = ref<ContainerInst>();

const draggedConnectorPort = computed(() => {
  if (!dragConnector.value) {
    // eslint-disable-next-line no-undefined
    return undefined;
  }

  const { direction } = dragConnector.value;

  // render only the connector for a single node; the one being dragged out of
  if (
    (direction === "out" && dragConnector.value.sourceNode !== props.nodeId) ||
    (direction === "in" && dragConnector.value.destNode !== props.nodeId)
  ) {
    // eslint-disable-next-line no-undefined
    return undefined;
  }

  const ports = direction === "out" ? props.outPorts : props.inPorts;
  const connectorIndex =
    direction === "out"
      ? dragConnector.value.sourcePort
      : dragConnector.value.destPort;

  return ports.find(({ index }) => index === connectorIndex);
});

// Since flow variables disappear when not hovered, we supply a position
// to render the original port that was dragged, in case it was a flow variable
const sourcePortPosition = computed(() => {
  if (
    !dragConnector.value ||
    !isDefaultFlowVariable(dragConnector.value.portInstance.index)
  ) {
    // eslint-disable-next-line no-undefined
    return undefined;
  }

  const { direction, portInstance } = dragConnector.value;
  const [x, y] = portPositions.value[direction][portInstance.index];

  return {
    x: props.anchor.x + x - $shapes.portSize / 2,
    y: props.anchor.y + y - $shapes.portSize / 2,
  };
});
</script>

<template>
  <Container ref="ports">
    <NodePortActiveConnector
      v-if="dragConnector && draggedConnectorPort"
      :drag-connector="dragConnector"
      :port="draggedConnectorPort"
      :source-port-position="sourcePortPosition"
    />

    <NodePort
      v-for="port of inPorts"
      :key="`out-${port.index}`"
      direction="in"
      :node-id="nodeId"
      :node-kind="nodeKind"
      :name="getPortContainerName(port.index, 'in')"
      :port="port"
      :position="{
        x: anchor.x + portPositions.in[port.index][0] - $shapes.portSize / 2,
        y: anchor.y + portPositions.in[port.index][1] - $shapes.portSize / 2,
      }"
    />

    <NodePort
      v-for="port of outPorts"
      :key="`out-${port.index}`"
      direction="out"
      :node-id="nodeId"
      :node-kind="nodeKind"
      :name="getPortContainerName(port.index, 'out')"
      :port="port"
      :position="{
        x: anchor.x + portPositions.out[port.index][0] - $shapes.portSize / 2,
        y: anchor.y + portPositions.out[port.index][1] - $shapes.portSize / 2,
      }"
    />
  </Container>
</template>
