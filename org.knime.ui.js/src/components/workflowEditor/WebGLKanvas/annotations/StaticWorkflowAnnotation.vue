<!-- eslint-disable no-undefined -->
<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  toRef,
  useTemplateRef,
  watch,
} from "vue";
import { useMagicKeys } from "@vueuse/core";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import { getMetaOrCtrlKey } from "@knime/utils";

import type {
  Bounds,
  WorkflowAnnotation as WorkflowAnnotationType,
} from "@/api/gateway-api/generated-api";
import { useAnnotationVisualStatus } from "@/components/workflowEditor/common/useVisualStatus";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useMovingStore } from "@/store/workflow/moving";
import { gridSize } from "@/style/shapes";
import * as shapes from "@/style/shapes";
import { geometry } from "@/util/geometry";
import type { ContainerInst, GraphicsInst } from "@/vue3-pixi";
import { FLOATING_HTML_FADE_DELAY_MS } from "../common/constants";
import { useObjectInteractions } from "../common/useObjectInteractions";
import { markPointerEventAsHandled } from "../util/interaction";

import TransformControls from "./TransformControls.vue";

const ANNOTATION_MIN_HEIGHT_PX = 30;
const ANNOTATION_MIN_WIDTH_PX = 30;

type Props = {
  annotation: WorkflowAnnotationType;
  zIndex: number;
};

const props = defineProps<Props>();

const annotationContainer = useTemplateRef<ContainerInst>(
  "annotationContainer",
);

// This is required for CEF to avoid having visual artifacts of the borders
// when panning/resizing annotations due to fractional pixels and GPU transforms
const wrapper = document.createElement("div");
wrapper.style.background = "white";
wrapper.style.padding = `${shapes.annotationBorderWidth}px`;

const annotationContent = document.createElement("div");
wrapper.appendChild(annotationContent);

const domContainer = new PIXI.DOMContainer({
  label: "StaticAnnotationText",
  eventMode: "none",
  element: wrapper,
});
annotationContent.classList.add("static-workflow-annotation");

const updateStyles = () => {
  annotationContent.style.width = `${props.annotation.bounds.width}px`;
  annotationContent.style.height = `${props.annotation.bounds.height}px`;
  annotationContent.style.zIndex = props.zIndex.toString();
  annotationContent.style.border = `${shapes.annotationBorderWidth}px solid ${props.annotation.borderColor}`;
};

const updateText = () => {
  annotationContent.innerHTML = props.annotation.text.value;
};

watch(
  () => props.annotation.text.value,
  (next, prev) => {
    const isSameText = next === prev;
    if (!isSameText) {
      updateText();
    }
  },
);

watch(
  [
    () => props.annotation.bounds.height,
    () => props.annotation.bounds.width,
    () => props.zIndex,
    () => props.annotation.borderColor,
  ],
  () => {
    updateStyles();
  },
);

onMounted(() => {
  updateText();
  updateStyles();

  annotationContainer.value!.addChild(domContainer);
});

onUnmounted(() => {
  domContainer.destroy();
});

const { toggleContextMenu } = useCanvasAnchoredComponentsStore();

const selectionStore = useSelectionStore();
const { isAnnotationSelected } = selectionStore;

const isSelected = computed(() => isAnnotationSelected(props.annotation.id));

const canvasStore = useWebGLCanvasStore();
const { toCanvasCoordinates, visibleArea, canvasLayers } =
  storeToRefs(canvasStore);

const onContextMenu = async (event: PIXI.FederatedPointerEvent) => {
  markPointerEventAsHandled(event, {
    initiator: "annotation::onContextMenu",
  });
  const [x, y] = toCanvasCoordinates.value([event.global.x, event.global.y]);

  canvasStore.setCanvasAnchor({
    isOpen: true,
    anchor: { x, y },
  });

  const metaOrCtrlKey = getMetaOrCtrlKey();
  const isMultiselect = event.shiftKey || event[metaOrCtrlKey];

  if (!isMultiselect && !isSelected.value) {
    const { wasAborted } = await selectionStore.deselectAllObjects();
    if (wasAborted) {
      return;
    }
  }

  selectionStore.selectAnnotations(props.annotation.id);
  await toggleContextMenu({ event });
};

const annotationInteractionStore = useAnnotationInteractionsStore();
const { editableAnnotationId, activeTransform } = storeToRefs(
  annotationInteractionStore,
);

const movingStore = useMovingStore();
const { movePreviewDelta } = storeToRefs(movingStore);

const { handlePointerInteraction } = useObjectInteractions({
  objectMetadata: { type: "annotation", annotationId: props.annotation.id },
  onDoubleClick: () => {
    editableAnnotationId.value = props.annotation.id;
  },
});

const isEditing = computed(
  () => editableAnnotationId.value === props.annotation.id,
);

const isResizing = computed(
  () => activeTransform.value?.annotationId === props.annotation.id,
);

const annotationControlsLayer = computed(() => {
  const defaultLayer = null;
  if (isEditing.value || isResizing.value) {
    return canvasLayers.value.annotationControls;
  }
  return defaultLayer;
});

const translatedPosition = computed(() => {
  const bounds =
    activeTransform.value && isResizing.value
      ? activeTransform.value.bounds
      : props.annotation.bounds;

  return isSelected.value
    ? {
        x: bounds.x + movePreviewDelta.value.x,
        y: bounds.y + movePreviewDelta.value.y,
      }
    : {
        x: bounds.x,
        y: bounds.y,
      };
});

const isWithinVisibleArea = computed(() => {
  const intersect = geometry.utils.rectangleIntersection(
    {
      left: props.annotation.bounds.x,
      top: props.annotation.bounds.y,
      width: props.annotation.bounds.width,
      height: props.annotation.bounds.height,
    },
    {
      left: visibleArea.value.x,
      top: visibleArea.value.y,
      width: visibleArea.value.width,
      height: visibleArea.value.height,
    },
  );

  return Boolean(intersect);
});

const { showFocus, showSelectionPlane, showTransformControls } =
  useAnnotationVisualStatus(toRef(props.annotation.id));

const onTransformChange = ({ bounds }: { bounds: Bounds }) => {
  // minimum size
  bounds.width = Math.max(ANNOTATION_MIN_WIDTH_PX, bounds.width);
  bounds.height = Math.max(ANNOTATION_MIN_HEIGHT_PX, bounds.height);

  activeTransform.value = {
    bounds,
    annotationId: props.annotation.id,
  };

  annotationInteractionStore.previewWorkflowAnnotationTransform({
    bounds,
    annotationId: props.annotation.id,
  });
};

const onTransformEnd = (bounds: Bounds) => {
  annotationInteractionStore.transformWorkflowAnnotation({
    bounds,
    annotationId: props.annotation.id,
  });

  setTimeout(() => {
    activeTransform.value = undefined;
  }, FLOATING_HTML_FADE_DELAY_MS);
};

const keyboardTransformActive = ref(false);
useMagicKeys({
  onEventFired: (event) => {
    const keys = [
      event.key === "ArrowUp",
      event.key === "ArrowDown",
      event.key === "ArrowLeft",
      event.key === "ArrowRight",
    ];

    if (
      event.type === "keyup" &&
      event.key === "Alt" &&
      keyboardTransformActive.value
    ) {
      keyboardTransformActive.value = false;
      onTransformEnd(activeTransform.value!.bounds);
      return;
    }

    if (
      event.type !== "keydown" ||
      !isSelected.value ||
      !showTransformControls.value ||
      !event.altKey
    ) {
      return;
    }

    if (!keys.includes(true)) {
      return;
    }

    const [isUp, isDown, isLeft, isRight] = keys;

    const TRANSFORM_AMOUNT = gridSize.x * 2;
    const delta = isUp || isLeft ? -1 : 1;
    const isXAxis = isLeft || isRight;
    const isYAxis = isUp || isDown;

    const width =
      activeTransform.value?.bounds.width ?? props.annotation.bounds.width;
    const height =
      activeTransform.value?.bounds.height ?? props.annotation.bounds.height;

    const nextWidth = Math.max(width + TRANSFORM_AMOUNT * delta, 0);
    const nextHeight = Math.max(height + TRANSFORM_AMOUNT * delta, 0);

    const nextBounds: Bounds = {
      x: props.annotation.bounds.x,
      y: props.annotation.bounds.y,
      width: isXAxis ? nextWidth : width,
      height: isYAxis ? nextHeight : height,
    };

    onTransformChange({ bounds: nextBounds });
    keyboardTransformActive.value = true;
  },
});
</script>

<template>
  <Container
    :label="`StaticWorkflowAnnotation__${annotation.id}`"
    :position="translatedPosition"
    :visible="isWithinVisibleArea"
    :renderable="isWithinVisibleArea"
    :z-index="zIndex"
    event-mode="static"
    @pointerdown="handlePointerInteraction"
    @rightclick.stop="onContextMenu"
  >
    <Container :layer="annotationControlsLayer">
      <TransformControls
        v-if="showTransformControls || showFocus || showSelectionPlane"
        :initial-value="
          keyboardTransformActive ? activeTransform?.bounds : annotation.bounds
        "
        :show-transform-controls="showTransformControls"
        :show-focus="showFocus"
        :show-selection="showSelectionPlane"
        @on-bounds-change="onTransformChange"
        @transform-end="onTransformEnd($event.bounds)"
      />
    </Container>

    <Graphics
      v-if="!isEditing"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.rect(
            0,
            0,
            annotation.bounds.width,
            annotation.bounds.height,
          );
          graphics.fill('transparent');
        }
      "
    />

    <Container
      ref="annotationContainer"
      :renderable="isWithinVisibleArea"
      label="AnnotationContentWrapper"
      :position="{
        x: -shapes.annotationBorderWidth,
        y: -shapes.annotationBorderWidth,
      }"
    />
  </Container>
</template>

<style lang="postcss">
@import url("@knime/styles/css/rich-text-editor.css");

.static-workflow-annotation {
  font-family: "Roboto Condensed", sans-serif;
  padding: 10px;
  font-variant-ligatures: none;
  overflow: hidden;
  background: white;
  white-space: break-spaces;
  word-break: normal;
  overflow-wrap: anywhere;

  @mixin rich-text-editor-styles;

  & p {
    /* font-size * line-height */
    min-height: calc(13 * 1.44 * 1px);
  }
}
</style>
