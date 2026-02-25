<script setup lang="ts">
/* eslint-disable no-magic-numbers */
import { computed, ref, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import { Container, FederatedPointerEvent, Rectangle } from "pixi.js";

import { Node, type NodePort, type XY } from "@/api/gateway-api/generated-api";
import { useGlobalBusListener } from "@/composables/useGlobalBusListener";
import { ports } from "@/lib/data-mappers";
import { useAnalytics } from "@/services/analytics";
import { useApplicationStore } from "@/store/application/application";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import { portSize } from "@/style/shapes";
import * as $shapes from "@/style/shapes";
import { type ContainerInst, type GraphicsInst } from "@/vue3-pixi";
import type { TooltipDefinition } from "../../types";
import { useAnimatePixiContainer } from "../common/useAnimatePixiContainer";
import { useTooltip } from "../tooltip/useTooltip";

import NodePortActions from "./NodePortActions.vue";
import Port from "./Port.vue";
import { usePortTransparency } from "./usePortTransparency";

interface Props {
  nodeId: string;
  nodeKind: Node.KindEnum;
  port: NodePort;
  selected: boolean;
  position: XY;
  direction: "in" | "out";
  disableQuickNodeAdd?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disableQuickNodeAdd: false,
});

const emit = defineEmits<{
  selectPort: [];
  deselect: [];
  remove: [];
}>();

const canvasStore = useWebGLCanvasStore();
const { isDebugModeEnabled: isCanvasDebugEnabled, canvasLayers } =
  storeToRefs(canvasStore);
const { availablePortTypes } = storeToRefs(useApplicationStore());

const hitAreaBufferSize = portSize / 6;
const hitArea = new Rectangle(
  (-portSize / 2) * hitAreaBufferSize,
  (-portSize / 2) * hitAreaBufferSize,
  portSize + hitAreaBufferSize * 3,
  portSize + hitAreaBufferSize * 3,
);

const portTemplate = computed(() => {
  const template = ports.toExtendedPortObject(availablePortTypes.value)(
    props.port.typeId,
  );
  if (!template) {
    throw new Error(
      `port template ${props.port.typeId} not available in application`,
    );
  }
  return template;
});

const isFlowVariable = computed(
  () => portTemplate.value.kind === "flowVariable",
);

const { openQuickActionMenu } = useCanvasAnchoredComponentsStore();

const floatingConnectorStore = useFloatingConnectorStore();
const { floatingConnector, isDragging: isDraggingFloatingConnector } =
  storeToRefs(floatingConnectorStore);

const isTargetedByFloatingConnector = ref(false);

// Don't use the `snapTarget` from the store to avoid a watcher that fires
// on every node and port
useGlobalBusListener({
  eventName: `connector-snap-active_${props.nodeId}__${props.direction}__${props.port.index}`,
  handler: ({ snapTarget }) => {
    isTargetedByFloatingConnector.value =
      !floatingConnectorStore.isPlaceholderPort(snapTarget) &&
      snapTarget.parentNodeId === props.nodeId &&
      snapTarget.index === props.port.index &&
      floatingConnector.value?.context.origin !== props.direction;
  },
});

useGlobalBusListener({
  eventName: `connector-snap-inactive_${props.nodeId}__${props.direction}__${props.port.index}`,
  handler: () => {
    isTargetedByFloatingConnector.value = false;
  },
});

const onPointerDown = (event: FederatedPointerEvent) => {
  floatingConnectorStore.createConnectorFromPointerEvent(event, {
    direction: props.direction,
    isFlowVariable: isFlowVariable.value,
    nodeId: props.nodeId,
    port: props.port,
    onCanvasDrop: () => {
      // ignore drop if quick add menu is disabled (e.g for metanode port bars)
      if (props.disableQuickNodeAdd) {
        return { removeConnector: true };
      }

      openQuickActionMenu({
        props: {
          position: floatingConnector.value!.absolutePoint,
          port: props.port,
          nodeRelation:
            props.direction === "out" ? "SUCCESSORS" : "PREDECESSORS",
          nodeId: props.nodeId,
          positionOrigin: "mouse",
        },
      });

      const analyticsEventId = `qam_opened::${
        props.direction === "out" ? "port_dragdrop_fwd" : "port_dragdrop_bwd"
      }` as const;

      useAnalytics().track(analyticsEventId, {
        nodeId: props.nodeId,
        nodeType: props.nodeKind,
        nodePortIndex: props.port.index,
        connectionType: portTemplate.value.kind,
      });

      return { removeConnector: false };
    },
  });
};

const onPointerUp = () => {
  if (!floatingConnectorStore.didMove) {
    emit("selectPort");
  }
};

const portContainer = useTemplateRef<ContainerInst>("portContainer");

const portTransparency = usePortTransparency({
  portContainer,
  nodeId: props.nodeId,
  port: props.port,
  nodeKind: props.nodeKind,
});

const isHovered = ref(false);

const tooltip = computed<TooltipDefinition>(() => {
  return {
    position: {
      // + 1 is due to the animation that makes the port bigger
      x: props.selected ? portSize : portSize / 2 + 1,
      y: 0,
    },
    gap: 4,
    title: props.port.name,
    text: props.port.info ?? "",
    orientation: "top",
    hoverable: false,
  } satisfies TooltipDefinition;
});

const tooltipRef = useTemplateRef<ContainerInst>("tooltipRef");
const { showTooltip, hideTooltip } = useTooltip({
  element: tooltipRef,
  tooltip,
});

const onPointerEnter = () => {
  isHovered.value = true;
};

const onPointerLeave = () => {
  isHovered.value = false;
};

const onClose = () => {
  if (props.selected) {
    emit("deselect");
  }
};

const portActionsOffsetX = () => {
  const delta = props.direction === "in" ? -1 : 1;
  return (
    ($shapes.portActionButtonSize + $shapes.portActionsGapSize) * 1 * delta
  );
};

// node port actions animation
const actionBarContainer = useTemplateRef<ContainerInst>("actionBarContainer");
const animating = ref<boolean>(false);

useAnimatePixiContainer({
  initialValue: 0,
  targetValue: portActionsOffsetX(),
  targetDisplayObject: actionBarContainer,
  animationParams: { duration: 0.25, ease: "easeInOut" },
  changeTracker: computed(() => props.selected),
  onUpdate: (value) => {
    actionBarContainer.value!.x = value;
    if (actionBarContainer.value!.x === 0) {
      animating.value = false;
    } else {
      animating.value = props.selected;
    }
  },
  animateOut: true,
  immediate: true,
});

useAnimatePixiContainer({
  initialValue: 0,
  targetValue: 1,
  targetDisplayObject: actionBarContainer,
  animationParams: { duration: 0.25, ease: "easeInOut" },
  changeTracker: computed(() => props.selected),
  onUpdate: (value) => {
    actionBarContainer.value!.scale = value;
  },
  animateOut: true,
  immediate: true,
});
</script>

<template>
  <Container
    ref="portContainer"
    :label="`NodePort__${nodeId}__${direction}__${port.index}`"
    :layer="selected ? canvasLayers.selectedPorts : null"
    :alpha="portTransparency.initialAlpha"
    event-mode="static"
    :position="position"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <Container
      ref="tooltipRef"
      label="NodePortHitAreaWrapper"
      :hit-area="hitArea"
      :pivot="{ x: -portSize / 2, y: -portSize / 2 }"
      event-mode="static"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointerenter="showTooltip"
      @pointerleave="hideTooltip"
    >
      <Graphics
        v-if="isCanvasDebugEnabled"
        :x="hitArea.x"
        :y="hitArea.y"
        label="NodePortHitArea"
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.rect(0, 0, hitArea.width, hitArea.height);
            graphics.stroke({ width: 1, color: 0x000000 });
          }
        "
      />
      <Port
        :port="port"
        :targeted="isTargetedByFloatingConnector"
        :hovered="isHovered && !isDraggingFloatingConnector"
        :selected="selected"
      />
    </Container>
    <Container ref="actionBarContainer" label="PortActionBarWrapper">
      <NodePortActions
        v-if="animating"
        :port="port"
        :pivot="{ x: -portSize / 2, y: -portSize / 2 }"
        :direction="direction"
        @action:remove="$emit('remove')"
        @close="onClose"
      />
    </Container>
  </Container>
</template>
