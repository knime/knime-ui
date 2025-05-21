<script setup lang="ts">
/**
 * A vertical bar holding ports. This is displayed in a metanode workflow to show the metanode's input / output ports.
 */
import { computed } from "vue";
import { storeToRefs } from "pinia";

import {
  Node,
  type NodePort as NodePortType,
} from "@/api/gateway-api/generated-api";
import { usePortBarPositions } from "@/composables/usePortBarPositions";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { useObjectInteractions } from "../common/useObjectInteractions";
import NodePort from "../ports/NodePort.vue";

type Props = {
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
};

const {
  getBounds,
  portBarXPos,
  portBarYPos,
  portBarHeight,
  portBarWidth,
  getPortBarPortYPosition,
} = usePortBarPositions();

const props = withDefaults(defineProps<Props>(), {
  type: "in",
});
const halfPortSize = $shapes.portSize / 2;

const isOutgoing = computed(() => props.type === "out");

const selectionStore = useSelectionStore();
const {
  isMetaNodePortBarSelected,
  selectMetanodePortBar,
  deselectMetanodePortBar,
} = selectionStore;
const { isDebugModeEnabled } = storeToRefs(useWebGLCanvasStore());

const isSelected = computed(() => isMetaNodePortBarSelected(props.type));

const portDirection = computed(() => (isOutgoing.value ? "in" : "out"));

const portPositions = computed(() => {
  const delta = $shapes.portSize + 1;
  // horizontal center of ports
  const positionX = isOutgoing.value ? -delta : delta;

  // x-coordinate is absolute
  // y-coordinate is relative to PortBar
  const mappedPorts = props.ports.map<[number, number]>((port) => [
    positionX,
    getPortBarPortYPosition(port.index, isOutgoing.value, false) - halfPortSize,
  ]);

  return {
    in: portDirection.value === "in" ? mappedPorts : [],
    out: portDirection.value === "out" ? mappedPorts : [],
  };
});

const barXOffset = computed(() =>
  isOutgoing.value ? 0 : -portBarWidth(isOutgoing.value),
);

const currentPortbarBounds = computed(() => getBounds(props.type === "out"));

const { movePreviewDelta } = storeToRefs(useMovingStore());
const workflowStore = useWorkflowStore();
const { activeWorkflow } = storeToRefs(workflowStore);

const portbarPosition = computed(() => ({
  x: portBarXPos(isOutgoing.value),
  y: portBarYPos(isOutgoing.value),
}));

const translatedPosition = computed(() => {
  return isMetaNodePortBarSelected(props.type)
    ? {
        x: portbarPosition.value.x + movePreviewDelta.value.x,
        y: portbarPosition.value.y + movePreviewDelta.value.y,
      }
    : portbarPosition.value;
});

const hasExistingBounds = computed(() =>
  Boolean(
    props.type === "out"
      ? activeWorkflow.value!.metaOutPorts?.bounds
      : activeWorkflow.value!.metaInPorts?.bounds,
  ),
);

const floatingConnectorStore = useFloatingConnectorStore();
const { isDragging: isDraggingFloatingConnector } = storeToRefs(
  floatingConnectorStore,
);

const snapTargetCandidate = computed(() => {
  return {
    id: props.containerId,
    position: currentPortbarBounds.value,
    inPorts: props.type === "out" ? props.ports : [],
    outPorts: props.type === "in" ? props.ports : [],
  };
});

const portSnappingPositions = computed(() => {
  return {
    in: portPositions.value.in.map(([x, y]): [number, number] => {
      return [x + halfPortSize, y + halfPortSize];
    }),
    out: portPositions.value.out.map(([x, y]): [number, number] => {
      return [x - halfPortSize, y + halfPortSize];
    }),
  };
});

const onNodeHoverAreaPointerMove = () => {
  if (!isDraggingFloatingConnector.value) {
    return;
  }

  floatingConnectorStore.onMoveOverConnectionSnapCandidate({
    candidate: snapTargetCandidate.value,
    portPositions: portSnappingPositions.value,
  });
};

const onNodeHoverAreaPointerLeave = () => {
  floatingConnectorStore.onLeaveConnectionSnapCandidate({
    candidate: snapTargetCandidate.value,
    portPositions: portSnappingPositions.value,
  });
};

const { handlePointerInteraction } = useObjectInteractions({
  objectId: props.containerId,
  selectObject: () => Promise.resolve(selectMetanodePortBar(props.type)),
  deselectObject: () => Promise.resolve(deselectMetanodePortBar(props.type)),
  isObjectSelected: () => isMetaNodePortBarSelected(props.type),
  onMoveEnd: async () => {
    // we need to set this on the first move as the backend has no data to translate otherwise
    // only send if we have really moved
    if (
      !hasExistingBounds.value &&
      !(movePreviewDelta.value.x === 0 && movePreviewDelta.value.y === 0)
    ) {
      const { type } = props;
      await workflowStore.transformMetaNodePortBar({
        // classic expects width 50 - we use 10
        bounds: { ...currentPortbarBounds.value, width: 50 },
        type,
      });
    }
    return { shouldMove: true };
  },
});
</script>

<template>
  <Container
    event-mode="static"
    :label="`PortBar__${type}__Wrapper`"
    :x="translatedPosition.x + barXOffset"
    :y="translatedPosition.y"
    @pointerdown="handlePointerInteraction"
    @pointermove="onNodeHoverAreaPointerMove"
    @pointerleave.self="onNodeHoverAreaPointerLeave"
  >
    <Graphics
      :x="-$shapes.metaNodeBarHorizontalPadding"
      event-mode="static"
      :alpha="isDebugModeEnabled ? 1 : 0"
      @render="
        (graphics) => {
          graphics.clear();
          graphics.rect(
            0,
            0,
            portBarWidth(isOutgoing) + $shapes.metaNodeBarHorizontalPadding * 2,
            portBarHeight(isOutgoing),
          );
          graphics.fill(0xf1f1f1);
        }
      "
    />

    <Graphics
      @render="
        (graphics) => {
          graphics.clear();
          graphics.rect(
            0,
            0,
            portBarWidth(isOutgoing),
            portBarHeight(isOutgoing),
          );
          graphics.fill($colors.Yellow);
        }
      "
    />

    <Graphics
      :visible="isSelected"
      :x="-$shapes.metaNodeBarHorizontalPadding"
      @render="
        (graphics) => {
          graphics.clear();
          graphics.roundRect(
            0,
            0,
            portBarWidth(isOutgoing) + $shapes.metaNodeBarHorizontalPadding * 2,
            portBarHeight(isOutgoing),
            2,
          );
          graphics.stroke({ width: 2, color: $colors.Cornflower });
        }
      "
    />

    <NodePort
      v-for="port of ports"
      :key="port.index"
      :direction="portDirection"
      :node-id="containerId"
      :node-kind="Node.KindEnum.Metanode"
      :port="port"
      :position="{
        x: portPositions[portDirection][port.index][0],
        y: portPositions[portDirection][port.index][1],
      }"
      :disable-quick-node-add="true"
      :selected="false"
    />
  </Container>
</template>
