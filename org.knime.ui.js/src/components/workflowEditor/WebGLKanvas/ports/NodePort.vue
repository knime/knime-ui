<script setup lang="ts">
/* eslint-disable no-magic-numbers */
import { computed, ref, useTemplateRef, watch } from "vue";
import { storeToRefs } from "pinia";
import { Container, FederatedPointerEvent, Rectangle } from "pixi.js";

import { Node, type NodePort, type XY } from "@/api/gateway-api/generated-api";
import { useGlobalBusListener } from "@/composables/useGlobalBusListener";
import { useApplicationStore } from "@/store/application/application";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import { portSize } from "@/style/shapes";
import { toExtendedPortObject } from "@/util/portDataMapper";
import { type ContainerInst, type GraphicsInst } from "@/vue3-pixi";
import { useTooltip } from "../../common/useTooltip";
import type { TooltipDefinition } from "../../types";

import Port from "./Port.vue";
import { useFlowVarPortTransparency } from "./useFlowVarPortTransparency";

interface Props {
  nodeId: string;
  nodeKind: Node.KindEnum;
  port: NodePort;
  position: XY;
  direction: "in" | "out";
  disableQuickNodeAdd?: boolean;
  isDraggingParent?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disableQuickNodeAdd: false,
});

const canvasStore = useWebGLCanvasStore();
const { isDebugModeEnabled: isCanvasDebugEnabled } = storeToRefs(canvasStore);
const { availablePortTypes } = storeToRefs(useApplicationStore());

const hitAreaBufferSize = portSize / 6;
const hitArea = new Rectangle(
  (-portSize / 2) * hitAreaBufferSize,
  (-portSize / 2) * hitAreaBufferSize,
  portSize + hitAreaBufferSize * 3,
  portSize + hitAreaBufferSize * 3,
);

const portTemplate = computed(() => {
  const template = toExtendedPortObject(availablePortTypes.value)(
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

      return { removeConnector: false };
    },
  });
};

const portContainer = useTemplateRef<ContainerInst>("portContainer");

const flowVarTransparency = useFlowVarPortTransparency({
  portContainer,
  port: props.port,
  nodeKind: props.nodeKind,
});

const isHovered = ref(false);

watch(
  () => props.isDraggingParent,
  () => {
    if (props.isDraggingParent) {
      flowVarTransparency.onPointerEnter();
    } else {
      flowVarTransparency.onPointerLeave();
    }
  },
);

const onPointerEnter = () => {
  isHovered.value = true;
  flowVarTransparency.onPointerEnter();
};

const onPointerLeave = () => {
  isHovered.value = false;
  flowVarTransparency.onPointerLeave();
};

const tooltip = computed<TooltipDefinition>(() => {
  return {
    position: {
      // + 1 is due to the animation that makes the port bigger
      x: portSize / 2 + 1,
      y: 0,
    },
    gap: 4,
    title: props.port.name,
    text: props.port.info ?? "",
    orientation: "top",
    hoverable: false,
  } satisfies TooltipDefinition;
});
useTooltip({ tooltip, element: portContainer });
</script>

<template>
  <Container
    ref="portContainer"
    :alpha="flowVarTransparency.initialAlpha ? 1 : 0"
    event-mode="static"
    :position="position"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <Container
      :hit-area="hitArea"
      :pivot="{ x: -portSize / 2, y: -portSize / 2 }"
      event-mode="static"
      @pointerdown="onPointerDown"
    >
      <Graphics
        v-if="isCanvasDebugEnabled"
        :x="hitArea.x"
        :y="hitArea.y"
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
      />
    </Container>
  </Container>
</template>
