<script setup lang="ts">
/* eslint-disable no-magic-numbers */
import { computed, shallowRef } from "vue";
import { storeToRefs } from "pinia";
import { Container, Rectangle } from "pixi.js";
import { type ContainerInst, type GraphicsInst } from "@/vue3-pixi";

import { Node, type NodePort, type XY } from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { portSize } from "@/style/shapes";
import { toExtendedPortObject } from "@/util/portDataMapper";

import Port from "./Port.vue";
import { useFlowVarPortTransparency } from "./useFlowVarPortTransparency";
import { usePortDragging } from "./usePortDragging";

interface Props {
  nodeId: string;
  nodeKind: Node.KindEnum;
  port: NodePort;
  position: XY;
  direction: "in" | "out";
  disableQuickNodeAdd?: boolean;
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

const { dragConnector, onPointerDown } = usePortDragging({
  direction: props.direction,
  isFlowVariable: isFlowVariable.value,
  nodeId: props.nodeId,
  port: props.port,

  onCanvasDrop: () => {
    // ignore drop if quick add menu is disabled (e.g for metanode port bars)
    if (props.disableQuickNodeAdd) {
      return { removeConnector: true };
    }

    const [x, y] = dragConnector.value!.absolutePoint;

    openQuickActionMenu({
      props: {
        position: { x, y },
        port: props.port,
        nodeRelation: props.direction === "out" ? "SUCCESSORS" : "PREDECESSORS",
        nodeId: props.nodeId,
        positionOrigin: "mouse",
      },
    });

    return { removeConnector: true };
  },
});

const onConnectionDrop = () => {
  if (!dragConnector.value) {
    return;
  }

  const from =
    dragConnector.value.sourceNode && dragConnector.value.sourcePort
      ? {
          nodeId: dragConnector.value.sourceNode,
          portIndex: dragConnector.value.sourcePort,
        }
      : { nodeId: props.nodeId, portIndex: props.port.index };

  const to =
    dragConnector.value.destNode && dragConnector.value.destPort
      ? {
          nodeId: dragConnector.value.destNode,
          portIndex: dragConnector.value.destPort,
        }
      : { nodeId: props.nodeId, portIndex: props.port.index };

  useNodeInteractionsStore().connectNodes({
    sourceNode: from.nodeId,
    sourcePort: from.portIndex,
    destNode: to.nodeId,
    destPort: to.portIndex,
  });
};

const portContainer = shallowRef<ContainerInst | undefined>();

const { initialAlpha, onPointerEnter, onPointerLeave } =
  useFlowVarPortTransparency({
    portContainer,
    port: props.port,
    nodeKind: props.nodeKind,
  });
</script>

<template>
  <Container
    ref="portContainer"
    :alpha="initialAlpha ? 1 : 0"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <Container
      :position="position"
      :hit-area="hitArea"
      :pivot="{ x: -portSize / 2, y: -portSize / 2 }"
      @pointerdown="onPointerDown"
      @pointerup="onConnectionDrop"
    >
      <Graphics
        v-if="isCanvasDebugEnabled"
        :x="hitArea.x"
        :y="hitArea.y"
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.lineStyle(1, 0x000000);
            graphics.drawRect(0, 0, hitArea.width, hitArea.height);
            graphics.endFill();
          }
        "
      />
      <Port :port="port" />
    </Container>
  </Container>
</template>
