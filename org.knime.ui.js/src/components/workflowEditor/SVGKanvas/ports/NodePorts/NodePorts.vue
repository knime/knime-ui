<script setup lang="ts">
import { computed, ref } from "vue";

import type { KnimeNode, NodePortGroups } from "@/api/custom-types";
import type {
  Node,
  NodePort as NodePortType,
} from "@/api/gateway-api/generated-api";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import type { TargetPort } from "../../../CanvasAnchoredComponents/PortTypeMenu/types";
import { usePortPositions } from "../../../common/usePortPositions";
import NodePort from "../NodePort/NodePort.vue";

import AddPortPlaceholder from "./AddPortPlaceholder.vue";
import { useNodeInfo } from "./useNodeInfo";
import { usePortAnimationClasses } from "./usePortAnimationClasses";
import { usePortKeyboardNavigation } from "./usePortKeyboardNavigation";
import { usePortSelection } from "./usePortSelection";

/**
 * This component renders and handles interactions with a Node's Ports
 */

type Props = {
  nodeId: string;
  nodeKind: Node.KindEnum;
  /**
   * Input ports. List of configuration objects passed-through to the `Port` component
   */
  inPorts: KnimeNode["inPorts"];
  /**
   * Output ports. List of configuration objects passed-through to the `Port` component
   */
  outPorts: KnimeNode["outPorts"];
  portGroups?: NodePortGroups | null;
  /** object that contains information which port to highlight */
  targetPort?: TargetPort | null;
  isEditable?: boolean;
  /** Interaction state of Node.vue that is passed through */
  hover?: boolean;
  connectorHover?: boolean;
  isSingleSelected?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  portGroups: null,
  targetPort: null,
  isEditable: false,
  hover: false,
  connectorHover: false,
  isSingleSelected: false,
});

type PortPositions = {
  in: Array<[number, number]>;
  out: Array<[number, number]>;
};
const emit = defineEmits<{
  updatePortPositions: [value: PortPositions];
}>();

const { isComponent, isMetanode } = useNodeInfo({ nodeId: props.nodeId });

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

/** Port positions */

const { portPositions, addPortPlaceholderPositions } = usePortPositions({
  nodeId: props.nodeId,
  canAddPort,
  inPorts: props.inPorts,
  outPorts: props.outPorts,
  emitPositionUpdate: (portPositions) =>
    emit("updatePortPositions", portPositions),
});

/* Port positions */

/** Port Selection */

const {
  currentlySelectedPort,
  updateSelection,
  portSelectionState,
  clearSelection,
  selectPort,
} = usePortSelection({
  nodeId: props.nodeId,
  isEditable: props.isEditable,
  portGroups: props.portGroups,
});

/** Port Selection */

/** Keyboard navigation */

const inputAddPortPlaceholder =
  ref<[InstanceType<typeof AddPortPlaceholder>]>();
const outputAddPortPlaceholder =
  ref<[InstanceType<typeof AddPortPlaceholder>]>();

usePortKeyboardNavigation({
  nodeId: props.nodeId,
  canAddPort,
  inPorts: props.inPorts,
  outPorts: props.outPorts,
  inputAddPortPlaceholder,
  outputAddPortPlaceholder,
  selectedPort: currentlySelectedPort,
  updatePortSelection: updateSelection,
});

/** Keyboard navigation */

const { portAnimationClasses, isMickeyMousePort } = usePortAnimationClasses({
  nodeId: props.nodeId,
  connectorHover: props.connectorHover,
  hover: props.hover,
});

const isPortTargeted = (index: number, side: "in" | "out") => {
  return props.targetPort?.side === side && props.targetPort.index === index;
};

const isPlaceholderPortTargeted = (side: "input" | "output") => {
  return side === "input"
    ? isPortTargeted(props.inPorts.length, "in")
    : isPortTargeted(props.outPorts.length, "out");
};

const nodeInteractionsStore = useNodeInteractionsStore();
const nodeConfigurationStore = useNodeConfigurationStore();

const addPort = async ({
  side,
  typeId,
  portGroup,
}: {
  side: "input" | "output";
  typeId: string;
  portGroup: string;
}) => {
  if (portSelectionState.isModificationInProgress.value) {
    return;
  }

  portSelectionState.setModificationInProgress(true);

  const canContinue = await nodeConfigurationStore.autoApplySettings();

  if (!canContinue) {
    portSelectionState.setModificationInProgress(false);
    return;
  }

  try {
    await nodeInteractionsStore.addNodePort({
      nodeId: props.nodeId,
      side,
      typeId,
      portGroup,
    });

    // AddPortPlaceholder may be removed after adding a port
    if (!canAddPort.value[side]) {
      const sidePorts = side === "input" ? props.inPorts : props.outPorts;
      updateSelection(`${side}-${sidePorts.length - 1}`);
    }
  } catch (error) {
    consola.error("Failed to add port", { error });
  } finally {
    portSelectionState.setModificationInProgress(false);
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

  await nodeInteractionsStore.removeNodePort({
    nodeId: props.nodeId,
    side,
    index,
  });

  clearSelection();
};

const isFirstRegularPort = (port: NodePortType) => {
  if (isMetanode.value && port.index === 0) {
    return true;
  }

  return port.index === 1;
};
</script>

<template>
  <g>
    <NodePort
      v-for="port of inPorts"
      :key="`input-${port.index}`"
      :class="['port', portAnimationClasses(port, 'in')]"
      direction="in"
      :node-id="nodeId"
      :node-kind="nodeKind"
      :port="port"
      :relative-position="portPositions.in[port.index]"
      :selected="currentlySelectedPort === `input-${port.index}`"
      :targeted="isPortTargeted(port.index, 'in')"
      :data-hide-in-workflow-preview="
        (isMickeyMousePort(port) && !port.connectedVia.length) || null
      "
      @click="selectPort(port, 'input')"
      @remove="removePort(port, 'input')"
      @deselect="clearSelection"
    />

    <NodePort
      v-for="port of outPorts"
      :key="`output-${port.index}`"
      :class="[
        'port',
        portAnimationClasses(port, 'out'),
        { 'first-regular-output-port': isFirstRegularPort(port) },
      ]"
      direction="out"
      :node-id="nodeId"
      :node-kind="nodeKind"
      :port="port"
      :relative-position="portPositions.out[port.index]"
      :selected="currentlySelectedPort === `output-${port.index}`"
      :targeted="isPortTargeted(port.index, 'out')"
      :data-hide-in-workflow-preview="
        (isMickeyMousePort(port) && !port.connectedVia.length) || null
      "
      @click="selectPort(port, 'output')"
      @remove="removePort(port, 'output')"
      @deselect="clearSelection"
    />

    <template v-for="side in ['input', 'output'] as const">
      <AddPortPlaceholder
        v-if="canAddPort[side]"
        :ref="`${side}AddPortPlaceholder`"
        :key="side"
        :side="side"
        :targeted="isPlaceholderPortTargeted(side)"
        :target-port="targetPort"
        :selected="currentlySelectedPort === `${side}-AddPort`"
        :node-id="nodeId"
        :position="addPortPlaceholderPositions[side]"
        :port-groups="portGroups"
        :class="[
          'add-port',
          {
            'node-hover': hover,
            'connector-hover': connectorHover,
            'node-selected': isSingleSelected,
            selected: currentlySelectedPort === `${side}-AddPort`,
          },
        ]"
        data-hide-in-workflow-preview
        @add-port="
          addPort({ side, typeId: $event.typeId, portGroup: $event.portGroup })
        "
      />
    </template>
  </g>
</template>

<style lang="postcss" scoped>
.port {
  transition: transform 120ms ease;

  &.mickey-mouse {
    opacity: 0;
    transition: opacity 0.5s 0.25s;

    &.node-hover {
      /* fade-in port with delay when node is hovered */
      transition: opacity 0.5s 0.5s;
      opacity: 1;
    }

    &:hover {
      /* immediately show port on direct hover */
      transition: none;
      opacity: 1;
    }

    &.connector-hover {
      /* fade-in port without delay on connectorHover */
      transition: opacity 0.25s;
      opacity: 1;
    }

    &.read-only {
      /* Hide if workflow is read-only */
      transition: none;
      opacity: 0;
    }

    &.connected {
      /* fade in port when a connection has been created */
      transition: opacity 0.25s;
      opacity: 1;
    }
  }
}

.add-port {
  opacity: 0;
  transition:
    opacity 0.2s,
    transform 120ms ease-out;

  &.node-selected,
  &.node-hover,
  &.selected {
    opacity: 1;
  }

  &.connector-hover {
    opacity: 1;
    transition: opacity 0s;
  }
}
</style>
