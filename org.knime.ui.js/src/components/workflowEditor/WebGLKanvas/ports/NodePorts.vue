<script setup lang="ts">
import { computed, ref } from "vue";

import type { NodePortGroups } from "@/api/custom-types";
import {
  Node,
  type NodePort as NodePortType,
} from "@/api/gateway-api/generated-api";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import * as $shapes from "@/style/shapes";
import type { ContainerInst } from "@/vue3-pixi";
import {
  type PortPositions,
  usePortPositions,
} from "../../common/usePortPositions";

import AddPortPlaceholder from "./AddPortPlaceholder.vue";
import NodePort from "./NodePort.vue";

interface Props {
  nodeId: string;
  isEditable: boolean;
  nodeKind: Node.KindEnum;
  inPorts: NodePortType[];
  outPorts: NodePortType[];
  portGroups?: NodePortGroups;
  isDraggingParent?: boolean;
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

const { portPositions, addPortPlaceholderPositions } = usePortPositions({
  nodeId: props.nodeId,
  canAddPort,
  // inPorts: props.inPorts,
  // outPorts: props.outPorts,
  emitPositionUpdate: (portPositions) =>
    emit("updatePortPositions", portPositions),
});

const isDefaultFlowVariable = (index: number) => {
  return !isMetanode.value && index === 0;
};

const getPortContainerLabel = (index: number, type: "in" | "out") => {
  const typeName = type === "in" ? "In" : "Out";
  return isDefaultFlowVariable(index)
    ? `Port__defaultFlowVar${typeName}`
    : `Port__${typeName}-${index}`;
};

const ports = ref<ContainerInst>();

const getPortPositionOffset = (type: "in" | "out", portIndex: number) => {
  return portPositions.value[type][portIndex] ?? [0, 0];
};

const nodeInteractionsStore = useNodeInteractionsStore();

const addPort = async ({
  side,
  typeId,
  portGroup,
}: {
  side: "input" | "output";
  typeId: string;
  portGroup?: string;
}) => {
  try {
    await nodeInteractionsStore.addNodePort({
      nodeId: props.nodeId,
      side,
      typeId,
      portGroup,
    });
  } catch (error) {
    consola.error("Failed to add port", { error });
  }
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
        x: getPortPositionOffset('in', port.index)[0] - $shapes.portSize / 2,
        y: getPortPositionOffset('in', port.index)[1] - $shapes.portSize / 2,
      }"
      :is-dragging-parent="isDraggingParent"
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
        x: getPortPositionOffset('out', port.index)[0] - $shapes.portSize / 2,
        y: getPortPositionOffset('out', port.index)[1] - $shapes.portSize / 2,
      }"
      :is-dragging-parent="isDraggingParent"
    />

    <template v-for="side in ['input', 'output'] as const" :key="side">
      <AddPortPlaceholder
        v-if="canAddPort[side]"
        :position="{
          x: addPortPlaceholderPositions[side][0],
          y: addPortPlaceholderPositions[side][1],
        }"
        :node-id="nodeId"
        :side="side"
        :port-groups="portGroups"
        @add-port="
          addPort({ side, typeId: $event.typeId, portGroup: $event.portGroup })
        "
      />
    </template>
  </Container>
</template>
