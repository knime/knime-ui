<script setup lang="ts">
import { computed, ref } from "vue";

import {
  Node,
  type NodePort as NodePortType,
  type PortGroup,
  type XY,
} from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import type { ContainerInst } from "@/vue3-pixi";
import {
  type PortPositions,
  usePortPositions,
} from "../../common/usePortPositions";

import NodePort from "./NodePort.vue";

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

const emit = defineEmits<{
  updatePortPositions: [value: PortPositions];
}>();

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

const { portPositions } = usePortPositions({
  nodeId: props.nodeId,
  canAddPort,
  inPorts: props.inPorts,
  outPorts: props.outPorts,
  emitPositionUpdate: (portPositions) =>
    emit("updatePortPositions", portPositions),
});

const isDefaultFlowVariable = (index: number) => {
  return !isMetanode.value && index === 0;
};

const getPortContainerLabel = (index: number, type: "in" | "out") => {
  const typeName = type === "in" ? "In" : "Out";
  return isDefaultFlowVariable(index)
    ? `${props.nodeId}__defaulFlowVar${typeName}`
    : `${props.nodeId}__out-${index}`;
};

const ports = ref<ContainerInst>();

const getPortPositionOffset = (type: "in" | "out", portIndex: number) => {
  return portPositions.value[type][portIndex] ?? [0, 0];
};
</script>

<template>
  <Container ref="ports" label="NodePorts">
    <NodePort
      v-for="port of inPorts"
      :key="`in-${port.index}`"
      direction="in"
      :node-id="nodeId"
      :node-kind="nodeKind"
      :label="getPortContainerLabel(port.index, 'in')"
      :port="port"
      :position="{
        x:
          anchor.x +
          getPortPositionOffset('in', port.index)[0] -
          $shapes.portSize / 2,
        y:
          anchor.y +
          getPortPositionOffset('in', port.index)[1] -
          $shapes.portSize / 2,
      }"
    />

    <NodePort
      v-for="port of outPorts"
      :key="`out-${port.index}`"
      direction="out"
      :node-id="nodeId"
      :node-kind="nodeKind"
      :label="getPortContainerLabel(port.index, 'out')"
      :port="port"
      :position="{
        x:
          anchor.x +
          getPortPositionOffset('out', port.index)[0] -
          $shapes.portSize / 2,
        y:
          anchor.y +
          getPortPositionOffset('out', port.index)[1] -
          $shapes.portSize / 2,
      }"
    />
  </Container>
</template>
