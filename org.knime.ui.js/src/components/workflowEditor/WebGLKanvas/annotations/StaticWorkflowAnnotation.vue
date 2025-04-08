<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import { computed, onMounted, useTemplateRef, watch } from "vue";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import { getMetaOrCtrlKey } from "@knime/utils";

import type { WorkflowAnnotation as WorkflowAnnotationType } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useMovingStore } from "@/store/workflow/moving";
import type { ContainerInst, GraphicsInst } from "@/vue3-pixi";
import { useObjectInteractions } from "../common/useObjectInteractions";
import { useZoomAwareResolution } from "../common/useZoomAwareResolution";

import { getAnnotationStyles } from "./annotationStyles";

const ANNOTATION_STROKE_SIZE = 2;
type Props = {
  annotation: WorkflowAnnotationType;
};

const props = defineProps<Props>();

const annotationContainer = useTemplateRef<ContainerInst>(
  "annotationContainer",
);

const { toggleContextMenu } = useCanvasAnchoredComponentsStore();

const selectionStore = useSelectionStore();
const { isAnnotationSelected } = storeToRefs(selectionStore);

const isSelected = computed(() => {
  return isAnnotationSelected.value(props.annotation.id);
});

const canvasStore = useWebGLCanvasStore();
const { toCanvasCoordinates } = storeToRefs(canvasStore);

const onContextMenu = (event: PIXI.FederatedPointerEvent) => {
  const [x, y] = toCanvasCoordinates.value([event.global.x, event.global.y]);

  canvasStore.setCanvasAnchor({
    isOpen: true,
    anchor: { x, y },
  });

  const metaOrCtrlKey = getMetaOrCtrlKey();
  const isMultiselect = event.shiftKey || event[metaOrCtrlKey];

  if (!isMultiselect && !isSelected.value) {
    selectionStore.deselectAllObjects();
  }

  selectionStore.selectAnnotation(props.annotation.id);
  toggleContextMenu({ event });
};

const { editableAnnotationId } = storeToRefs(useAnnotationInteractionsStore());

const movingStore = useMovingStore();
const { movePreviewDelta } = storeToRefs(movingStore);

const positionWithDelta = computed(() => ({
  x: props.annotation.bounds.x + movePreviewDelta.value.x,
  y: props.annotation.bounds.y + movePreviewDelta.value.y,
}));

const translatedPosition = computed(() => {
  return isSelected.value ? positionWithDelta.value : props.annotation.bounds;
});

const { handlePointerInteraction } = useObjectInteractions({
  isObjectSelected: () => isSelected.value,
  selectObject: () => selectionStore.selectAnnotation(props.annotation.id),
  deselectObject: () => selectionStore.deselectAnnotation(props.annotation.id),
  onDoubleClick: () => {
    editableAnnotationId.value = props.annotation.id;
  },
});

const autoUpdateResolution = (textInstance: PIXI.HTMLText) => {
  const { resolution } = useZoomAwareResolution();
  watch(
    resolution,
    () => {
      textInstance.resolution = resolution.value;
    },
    { immediate: true },
  );
};

onMounted(() => {
  const annotationTextWithStyles = getAnnotationStyles(
    props.annotation,
    ANNOTATION_STROKE_SIZE,
  );

  const text = new PIXI.HTMLText({
    text: annotationTextWithStyles,
    style: {
      fontFamily: "Roboto Condensed",
      wordWrap: true,
      wordWrapWidth: props.annotation.bounds.width,
    },
  });

  text.roundPixels = true;
  autoUpdateResolution(text);
  annotationContainer.value!.addChild(text);
});
</script>

<template>
  <Container :position="translatedPosition">
    <Graphics
      :renderable="isSelected"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.rect(
            -ANNOTATION_STROKE_SIZE,
            -ANNOTATION_STROKE_SIZE,
            annotation.bounds.width + ANNOTATION_STROKE_SIZE * 2,
            annotation.bounds.height + ANNOTATION_STROKE_SIZE * 2,
          );
          graphics.stroke({
            width: 1,
            color: $colors.Cornflower,
          });
        }
      "
    />

    <Graphics
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.rect(
            ANNOTATION_STROKE_SIZE / 2,
            ANNOTATION_STROKE_SIZE / 2,
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
      event-mode="static"
      :width="annotation.bounds.width"
      :height="annotation.bounds.height"
      @pointerdown.stop.prevent="handlePointerInteraction"
      @rightclick.stop.prevent="onContextMenu"
    />
  </Container>
</template>
