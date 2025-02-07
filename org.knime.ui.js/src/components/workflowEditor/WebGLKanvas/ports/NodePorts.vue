<script setup lang="ts">
import { computed, ref } from "vue";
import { gsap } from "gsap";
import type { Container, FederatedPointerEvent } from "pixi.js";

import {
  Node,
  type PortGroup,
  type XY,
  type NodePort as _NodePortType,
} from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import {
  portPositions as _portPositions,
  placeholderPosition,
} from "@/util/portShift";
import { useNodeHoveredStateListener } from "../node/useNodeHoveredState";

import NodePort from "./NodePort.vue";

interface Props {
  nodeId: string;
  anchor: XY;
  isEditable: boolean;
  nodeKind: Node.KindEnum;
  inPorts: _NodePortType[];
  outPorts: _NodePortType[];
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

const ports = ref<Container | null>(null);
const getFlowVariableContainers = () => {
  const defaulFlowVarOut = ports.value!.getChildByName(
    getPortContainerName(0, "out"),
  );
  const defaulFlowVarIn = ports.value!.getChildByName(
    getPortContainerName(0, "in"),
  );
  return [defaulFlowVarOut, defaulFlowVarIn];
};

useNodeHoveredStateListener({
  nodeId: props.nodeId,
  onEnterCallback: () => {
    const [defaulFlowVarOut, defaulFlowVarIn] = getFlowVariableContainers();

    gsap.to(defaulFlowVarOut, { alpha: 1, duration: 0.5, delay: 0.25 });
    gsap.to(defaulFlowVarIn, { alpha: 1, duration: 0.5, delay: 0.25 });
  },
  onLeaveCallback: () => {
    const [defaulFlowVarOut, defaulFlowVarIn] = getFlowVariableContainers();

    gsap.to(defaulFlowVarOut, { alpha: 0, duration: 0.5, delay: 0.25 });
    gsap.to(defaulFlowVarIn, { alpha: 0, duration: 0.5, delay: 0.25 });
  },
});

const revealFlowVarPort = (event: FederatedPointerEvent, index: number) => {
  if (!isDefaultFlowVariable(index)) {
    return;
  }

  gsap.to(event.target, { alpha: 1, duration: 0.5 });
};

const hideFlowVarPort = (event: FederatedPointerEvent, index: number) => {
  if (!isDefaultFlowVariable(index)) {
    return;
  }

  gsap.to(event.target, { alpha: 0, duration: 0.5 });
};

const getPortAlpha = (port: _NodePortType) => {
  if (port.connectedVia.length) {
    return 1;
  }

  return isDefaultFlowVariable(port.index) ? 0 : 1;
};
</script>

<template>
  <Container ref="ports">
    <NodePort
      v-for="port of inPorts"
      :key="`out-${port.index}`"
      direction="in"
      :node-id="nodeId"
      :name="getPortContainerName(port.index, 'in')"
      :alpha="getPortAlpha(port)"
      :port="port"
      :position="{
        x: anchor.x + portPositions.in[port.index][0] - $shapes.portSize / 2,
        y: anchor.y + portPositions.in[port.index][1] - $shapes.portSize / 2,
      }"
      @pointerenter="revealFlowVarPort($event, port.index)"
      @pointerleave="hideFlowVarPort($event, port.index)"
    />

    <NodePort
      v-for="port of outPorts"
      :key="`out-${port.index}`"
      direction="out"
      :node-id="nodeId"
      :name="getPortContainerName(port.index, 'out')"
      :alpha="getPortAlpha(port)"
      :port="port"
      :position="{
        x: anchor.x + portPositions.out[port.index][0] - $shapes.portSize / 2,
        y: anchor.y + portPositions.out[port.index][1] - $shapes.portSize / 2,
      }"
      @pointerenter="revealFlowVarPort($event, port.index)"
      @pointerleave="hideFlowVarPort($event, port.index)"
    />
  </Container>
</template>
