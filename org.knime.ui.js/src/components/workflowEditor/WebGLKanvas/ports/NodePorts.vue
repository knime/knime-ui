<script setup lang="ts">
import { type ComponentPublicInstance, computed, ref } from "vue";

import type { NodePortGroups } from "@/api/custom-types";
import {
  Node,
  type NodePort as NodePortType,
} from "@/api/gateway-api/generated-api";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import * as $shapes from "@/style/shapes";
import type { Container } from "pixi.js";
import {
  type PortPositions,
  usePortPositions,
} from "../../common/usePortPositions";
import { usePortSelection } from "../../common/usePortSelection";

import AddPortPlaceholder from "./AddPortPlaceholder.vue";
import NodePort from "./NodePort.vue";
import { usePortKeyboardNavigation } from "./usePortKeyboardNavigation";

interface Props {
  nodeId: string;
  isEditable: boolean;
  nodeKind: Node.KindEnum;
  inPorts: NodePortType[];
  outPorts: NodePortType[];
  portGroups?: NodePortGroups;
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
    ? `Port__defaultFlowVar${typeName}`
    : `Port__${typeName}-${index}`;
};

const ports = ref<Container>();

const getPortPositionOffset = (type: "in" | "out", portIndex: number) => {
  return portPositions.value[type][portIndex] ?? [0, 0];
};

const {
  currentlySelectedPort,
  portSelectionState,
  clearSelection,
  selectPort,
  updateSelection,
} = usePortSelection({
  nodeId: props.nodeId,
  isEditable: props.isEditable,
  portGroups: props.portGroups,
});

type AddPortPlaceholderComponent = InstanceType<typeof AddPortPlaceholder>;

const placeholderRefs = {
  input: ref<AddPortPlaceholderComponent>(),
  output: ref<AddPortPlaceholderComponent>(),
};

const assignPlaceholders = (
  side: "input" | "output",
  placeholder: Element | ComponentPublicInstance | null,
) => {
  if (placeholder) {
    placeholderRefs[side].value = placeholder as AddPortPlaceholderComponent;
  }
};

usePortKeyboardNavigation({
  nodeId: props.nodeId,
  canAddPort,
  inPorts: props.inPorts,
  outPorts: props.outPorts,
  selectedPort: currentlySelectedPort,
  updatePortSelection: updateSelection,
  onKeydownEnterIn: computed(() => placeholderRefs.input.value?.onKeydownEnter),
  onKeydownEnterOut: computed(
    () => placeholderRefs.output.value?.onKeydownEnter,
  ),
});
const nodeInteractionsStore = useNodeInteractionsStore();
const nodeConfigurationStore = useNodeConfigurationStore();

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

const removePort = async (
  { index }: NodePortType,
  side: "input" | "output",
) => {
  const canContinue = await nodeConfigurationStore.autoApplySettings();

  if (!canContinue) {
    portSelectionState.setModificationInProgress(false);
    return;
  }

  nodeInteractionsStore.removeNodePort({
    nodeId: props.nodeId,
    side,
    index,
  });
  clearSelection();
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
      :selected="currentlySelectedPort === `input-${port.index}`"
      :position="{
        x: getPortPositionOffset('in', port.index)[0] - $shapes.portSize / 2,
        y: getPortPositionOffset('in', port.index)[1] - $shapes.portSize / 2,
      }"
      @select-port="selectPort(port, 'input')"
      @remove="removePort(port, 'input')"
      @deselect="clearSelection"
    />

    <NodePort
      v-for="port of outPorts"
      :key="`out-${port.index}`"
      direction="out"
      :node-id="nodeId"
      :node-kind="nodeKind"
      :label="getPortContainerLabel(port.index, 'out')"
      :port="port"
      :selected="currentlySelectedPort === `output-${port.index}`"
      :position="{
        x: getPortPositionOffset('out', port.index)[0] - $shapes.portSize / 2,
        y: getPortPositionOffset('out', port.index)[1] - $shapes.portSize / 2,
      }"
      @select-port="selectPort(port, 'output')"
      @remove="removePort(port, 'output')"
      @deselect="clearSelection"
    />

    <template v-for="side in ['input', 'output'] as const" :key="side">
      <AddPortPlaceholder
        v-if="canAddPort[side]"
        :ref="(el) => assignPlaceholders(side, el)"
        :position="{
          x: addPortPlaceholderPositions[side][0],
          y: addPortPlaceholderPositions[side][1],
        }"
        :node-id="nodeId"
        :side="side"
        :port-groups="portGroups"
        :selected="currentlySelectedPort === `${side}-AddPort`"
        @add-port="
          addPort({ side, typeId: $event.typeId, portGroup: $event.portGroup })
        "
        @deselect="clearSelection"
      />
    </template>
  </Container>
</template>
