<!-- eslint-disable no-undefined -->
<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  ref,
  toRef,
  useTemplateRef,
  watch,
} from "vue";
import { useMagicKeys, watchDebounced } from "@vueuse/core";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import { getMetaOrCtrlKey } from "@knime/utils";

import type {
  Bounds,
  WorkflowAnnotation,
  WorkflowAnnotation as WorkflowAnnotationType,
} from "@/api/gateway-api/generated-api";
import { useAnnotationVisualStatus } from "@/components/workflowEditor/common/useVisualStatus";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useMovingStore } from "@/store/workflow/moving";
import { gridSize } from "@/style/shapes";
import { geometry } from "@/util/geometry";
import type { ContainerInst, GraphicsInst } from "@/vue3-pixi";
import { FLOATING_HTML_FADE_DELAY_MS } from "../common/constants";
import { useObjectInteractions } from "../common/useObjectInteractions";
import { useZoomAwareResolution } from "../common/useZoomAwareResolution";
import { markPointerEventAsHandled } from "../util/interaction";

import TransformControls from "./TransformControls.vue";
import { getAnnotationStyles } from "./annotationStyles";

const ANNOTATION_MIN_HEIGHT_PX = 30;
const ANNOTATION_MIN_WIDTH_PX = 30;

const ANNOTATION_STROKE_SIZE = 1.5;
type Props = {
  annotation: WorkflowAnnotationType;
};

const props = defineProps<Props>();

const annotationContainer = useTemplateRef<ContainerInst>(
  "annotationContainer",
);

const { toggleContextMenu } = useCanvasAnchoredComponentsStore();

const selectionStore = useSelectionStore();
const { isAnnotationSelected } = selectionStore;

const isSelected = computed(() => isAnnotationSelected(props.annotation.id));

const canvasStore = useWebGLCanvasStore();
const { toCanvasCoordinates, visibleArea } = storeToRefs(canvasStore);

const onContextMenu = async (event: PIXI.FederatedPointerEvent) => {
  markPointerEventAsHandled(event, { initiator: "annotation-ctx-menu" });
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

const translatedPosition = computed(() => {
  const bounds =
    activeTransform.value &&
    activeTransform.value.annotationId === props.annotation.id
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

const renderable = computed(() => {
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

let textRef: PIXI.HTMLText | undefined;
const { resolution } = useZoomAwareResolution();

const autoUpdateResolution = () => {
  // debounce because the resolution or renderable sources
  // could change fast often. e.g resolution due to fast zoom in/out
  // and renderable due to fast panning which culls out of view annotations
  watchDebounced(
    [resolution, renderable],
    () => {
      requestAnimationFrame(() => {
        if (textRef && renderable.value) {
          textRef.resolution = resolution.value;
        }
      });
    },
    { immediate: true, debounce: 600 },
  );
};

const updateAnnotationText = (nextValue: WorkflowAnnotation, force = false) => {
  // do not update it if we are not rendered unless we are forced to
  if (!renderable.value && !force) {
    return;
  }

  if (textRef) {
    annotationContainer.value!.removeChildAt(0);
    textRef = undefined;
  }

  const annotationTextWithStyles = getAnnotationStyles(
    nextValue,
    ANNOTATION_STROKE_SIZE,
  );

  const text = new PIXI.HTMLText({
    label: "AnnotationText",
    text: annotationTextWithStyles,
    style: {
      fontFamily: "Roboto Condensed",
      wordWrap: true,
      wordWrapWidth: nextValue.bounds.width,
    },
  });

  text.roundPixels = true;
  text.resolution = resolution.value;
  textRef = text;
  nextTick(() => {
    requestAnimationFrame(() => {
      // as this is async the container might be already gone
      annotationContainer.value?.addChild(text);
    });
  });
};

watch(
  () => props.annotation.text.value,
  (next, prev) => {
    const isSameText = next === prev;
    if (!isSameText) {
      updateAnnotationText(props.annotation);
    }
  },
);

onMounted(() => {
  updateAnnotationText(props.annotation, true);
  autoUpdateResolution();
});

const isStaticContent = computed(
  () =>
    activeTransform.value?.annotationId !== props.annotation.id &&
    editableAnnotationId.value !== props.annotation.id,
);

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
};

const onTransformEnd = (bounds: Bounds) => {
  annotationInteractionStore.transformWorkflowAnnotation({
    bounds,
    annotationId: props.annotation.id,
  });
  updateAnnotationText({
    ...props.annotation,
    bounds,
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

const { canvasLayers } = storeToRefs(canvasStore);
</script>

<template>
  <Container
    :label="`StaticWorkflowAnnotation__${annotation.id}`"
    :position="translatedPosition"
    :visible="renderable"
    :renderable="renderable"
    event-mode="static"
    @pointerdown="handlePointerInteraction"
    @rightclick.stop="onContextMenu"
  >
    <Container
      :layer="
        editableAnnotationId === annotation.id
          ? canvasLayers.annotationControls
          : null
      "
    >
      <TransformControls
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
      v-if="isStaticContent"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.rect(
            0,
            0,
            annotation.bounds.width,
            annotation.bounds.height,
          );
          graphics.fill($colors.White);
        }
      "
    />

    <Graphics
      v-if="isStaticContent"
      label="AnnotationBorder"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.rect(
            0.5,
            0.5,
            annotation.bounds.width - ANNOTATION_STROKE_SIZE,
            annotation.bounds.height - ANNOTATION_STROKE_SIZE,
          );
          graphics.stroke({
            width: ANNOTATION_STROKE_SIZE,
            color: annotation.borderColor,
          });
        }
      "
    />

    <Container
      ref="annotationContainer"
      label="AnnotationContentWrapper"
      :renderable="
        renderable && activeTransform?.annotationId !== annotation.id
      "
      :width="annotation.bounds.width"
      :height="annotation.bounds.height"
    />
  </Container>
</template>
