<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref, toRef, unref, watch } from "vue";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import type { KnimeNode } from "@/api/custom-types";
import {
  MetaNodeState,
  NativeNodeInvariants,
  Node,
} from "@/api/gateway-api/generated-api";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { geometry } from "@/util/geometry";
import { isNodeComponent, isNodeMetaNode } from "@/util/nodeUtil";
import { type GraphicsInst } from "@/vue3-pixi";
import { useSelectionPreview } from "../SelectionRectangle/useSelectionPreview";
import NodePorts from "../ports/NodePorts.vue";
import { nodeNameText } from "../util/textStyles";

import NodeSelectionPlane from "./NodeSelectionPlane.vue";
import NodeState from "./nodeState/NodeState.vue";
import NodeTorso from "./torso/NodeTorso.vue";
import { useNodeHoverSize } from "./useNodeHoverSize";
import { useNodeHoveredStateProvider } from "./useNodeHoveredState";

const MIN_MOVE_THRESHOLD = 5;

interface Props {
  node: KnimeNode;
  position: { x: number; y: number };
  name: string;
  icon?: string | null;
  type?: NativeNodeInvariants.TypeEnum | null;
}

const props = withDefaults(defineProps<Props>(), {
  icon: null,
  type: null,
  link: null,
});

const emit = defineEmits<{
  contextmenu: [event: PIXI.FederatedPointerEvent];
}>();

const { zoomFactor, isDebugModeEnabled, pixiApplication, visibleArea } =
  storeToRefs(useWebGLCanvasStore());

const selectionStore = useSelectionStore();
const { isNodeSelected, getFocusedObject } = storeToRefs(selectionStore);
const { isWritable } = storeToRefs(useWorkflowStore());

const movingStore = useMovingStore();
const { isDragging, movePreviewDelta } = storeToRefs(movingStore);

const positionWithDelta = computed(() => ({
  x: props.position.x + movePreviewDelta.value.x,
  y: props.position.y + movePreviewDelta.value.y,
}));

const translatedPosition = computed(() => {
  return isNodeSelected.value(props.node.id)
    ? positionWithDelta.value
    : props.position;
});

watch(
  toRef(props, "position"),
  () => {
    if (isDragging.value) {
      movingStore.resetDragState();
    }
  },
  { deep: true },
);

const startPos = ref<{ x: number; y: number }>({ x: 0, y: 0 });

const isEditable = computed(() => {
  if (!isWritable.value) {
    return false;
  }

  return isNodeComponent(props.node) ? !props.node.link : true;
});

const onPointerDown = (pointerDownEvent: PIXI.FederatedPointerEvent) => {
  if (pointerDownEvent.button !== 0) {
    return;
  }

  const canvas = pixiApplication.value!.canvas;
  canvas.setPointerCapture(pointerDownEvent.pointerId);

  startPos.value = {
    x: pointerDownEvent.global.x,
    y: pointerDownEvent.global.y,
  };

  const isMultiselect =
    pointerDownEvent.shiftKey ||
    pointerDownEvent.ctrlKey ||
    pointerDownEvent.metaKey;

  if (!isNodeSelected.value(props.node.id) && !isMultiselect) {
    selectionStore.deselectAllObjects();
    selectionStore.selectNode(props.node.id);
  }
  if (isMultiselect) {
    if (isNodeSelected.value(props.node.id)) {
      selectionStore.deselectNode(props.node.id);
    } else {
      selectionStore.selectNode(props.node.id);
    }
  }

  let didDrag = false;
  movingStore.setIsDragging(true);

  const onMove = (pointerMoveEvent: PointerEvent): void => {
    const deltaX =
      (pointerMoveEvent.offsetX - startPos.value.x) / zoomFactor.value;
    const deltaY =
      (pointerMoveEvent.offsetY - startPos.value.y) / zoomFactor.value;

    if (
      Math.abs(deltaX) >= MIN_MOVE_THRESHOLD ||
      Math.abs(deltaY) >= MIN_MOVE_THRESHOLD
    ) {
      didDrag = true;
    }

    movingStore.setMovePreview({ deltaX, deltaY });
  };

  const onUp = () => {
    if (!didDrag) {
      if (!isMultiselect && isNodeSelected.value(props.node.id)) {
        selectionStore.deselectAllObjects();
      }
      selectionStore.selectNode(props.node.id);
    }

    movingStore.moveObjects();
    canvas.releasePointerCapture(pointerDownEvent.pointerId);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
  };

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
};

const { isSelectionPreviewShown } = useSelectionPreview({
  objectId: props.node.id,
  eventNameResolver: () => `node-selection-preview-${props.node.id}`,
  isObjectSelected: unref(isNodeSelected),
});

const isSelectionFocusShown = computed(
  () => getFocusedObject.value?.id === props.node.id,
);

const { onPointerEnter, onPointerLeave, hoveredNodeId } =
  useNodeHoveredStateProvider();

const { useEmbeddedDialogs } = storeToRefs(useApplicationSettingsStore());
const { hoverSize } = useNodeHoverSize({
  isHovering: computed(() => hoveredNodeId.value === props.node.id),
  dialogType: Node.DialogTypeEnum.Web,
  isUsingEmbeddedDialogs: useEmbeddedDialogs,
  nodeNameDimensions: ref({ width: 0, height: 18 }),
  allowedActions: props.node.allowedActions!,
});

const renderHoverArea = (graphics: GraphicsInst) => {
  graphics.clear();

  graphics.rect(
    hoverSize.value.x,
    hoverSize.value.y,
    hoverSize.value.width,
    hoverSize.value.height,
  );

  if (isDebugModeEnabled.value) {
    // eslint-disable-next-line no-magic-numbers
    graphics.fill(0xf1f1f1);
  }
};

const renderable = computed(
  () =>
    !geometry.utils.isPointOutsideBounds(
      translatedPosition.value,
      visibleArea.value,
    ),
);

const nodeNamePosition = computed(() => {
  const { x, y } = translatedPosition.value;
  return {
    x: x + hoverSize.value.x + hoverSize.value.width / 2,
    y: y - $shapes.nodeSize / 2 - $shapes.nodeNameMargin,
  };
});

const hitArea = computed(
  () =>
    new PIXI.Rectangle(
      hoverSize.value.x,
      hoverSize.value.y,
      hoverSize.value.width,
      hoverSize.value.height,
    ),
);

const isMetanode = computed(() => isNodeMetaNode(props.node));

const style = new PIXI.TextStyle(nodeNameText.styles);
const nameMeasures = PIXI.CanvasTextMetrics.measureText(
  props.name,
  style,
  undefined,
  true,
);
const SINGLE_LINE_TEXT_HEIGHT_THRESHOLD = 40;
const textYAnchor = computed(() =>
  nameMeasures.height <= SINGLE_LINE_TEXT_HEIGHT_THRESHOLD ? 0 : 0.5,
);
</script>

<template>
  <NodeSelectionPlane
    :kind="node.kind"
    :anchor-position="translatedPosition"
    :renderable="renderable"
    :show-selection="isSelectionPreviewShown"
    :show-focus="isSelectionFocusShown"
    :width="
      nameMeasures.width * nodeNameText.downscalingFactor +
      $shapes.nodeNameHorizontalMargin * 2
    "
    :extra-height="nameMeasures.height * nodeNameText.downscalingFactor"
  />

  <Container
    :label="node.id"
    :renderable="renderable"
    event-mode="static"
    @rightclick="emit('contextmenu', $event)"
    @pointerenter="onPointerEnter(node.id)"
    @pointerleave.self="onPointerLeave()"
    @pointerdown="onPointerDown"
  >
    <Graphics
      label="NodeHoverArea"
      :hit-area="hitArea"
      :position="translatedPosition"
      @render="renderHoverArea"
    />

    <Text
      label="NodeName"
      :position="nodeNamePosition"
      :resolution="1.2"
      :scale="nodeNameText.downscalingFactor"
      :style="nodeNameText.styles"
      :anchor="{ x: 0.5, y: textYAnchor }"
      :round-pixels="true"
    >
      {{ name }}
    </Text>

    <NodePorts
      :node-id="node.id"
      :node-kind="node.kind"
      :anchor="translatedPosition"
      :in-ports="node.inPorts"
      :out-ports="node.outPorts"
      :is-editable="isEditable"
      :port-groups="null"
    />

    <Container label="NodeTorsoContainer" :position="translatedPosition">
      <NodeTorso
        :node-id="node.id"
        :kind="node.kind"
        :type="type"
        :icon="icon"
        :execution-state="
          isMetanode
            ? (node.state?.executionState as MetaNodeState.ExecutionStateEnum)
            : undefined
        "
      />

      <NodeState v-if="!isMetanode" v-bind="node.state" />
    </Container>
  </Container>
</template>
