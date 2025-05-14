<!-- eslint-disable no-undefined -->
<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import {
  computed,
  onMounted,
  shallowRef,
  toRef,
  useTemplateRef,
  watch,
} from "vue";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import { getMetaOrCtrlKey } from "@knime/utils";

import type {
  Bounds,
  WorkflowAnnotation,
  WorkflowAnnotation as WorkflowAnnotationType,
} from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useMovingStore } from "@/store/workflow/moving";
import { geometry } from "@/util/geometry";
import type { ContainerInst, GraphicsInst } from "@/vue3-pixi";
import { useAnnotationSelection } from "../../common/annotations/useAnnotationSelection";
import { useSelectionPreview } from "../SelectionRectangle/useSelectionPreview";
import { FLOATING_HTML_FADE_DELAY_MS } from "../common/constants";
import { useObjectInteractions } from "../common/useObjectInteractions";
import { useZoomAwareResolution } from "../common/useZoomAwareResolution";
import { markEventAsHandled } from "../util/interaction";

import TransformControls from "./TransformControls.vue";
import { getAnnotationStyles } from "./annotationStyles";

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
  markEventAsHandled(event, { initiator: "annotation-ctx-menu" });
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
  objectId: props.annotation.id,
  isObjectSelected: () => isSelected.value,
  selectObject: () =>
    Promise.resolve(selectionStore.selectAnnotations(props.annotation.id)),
  deselectObject: () =>
    Promise.resolve(selectionStore.deselectAnnotations(props.annotation.id)),
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

const textRef = shallowRef<PIXI.HTMLText>();
const { resolution } = useZoomAwareResolution();

const autoUpdateResolution = () => {
  watch(
    resolution,
    () => {
      if (textRef.value) {
        textRef.value.resolution = resolution.value;
      }
    },
    { immediate: true },
  );
};

const updateAnnotationText = (nextValue: WorkflowAnnotation) => {
  if (textRef.value) {
    annotationContainer.value!.removeChildAt(0);
    textRef.value = undefined;
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
  annotationContainer.value!.addChild(text);
  text.resolution = resolution.value;
  textRef.value = text;
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
  updateAnnotationText(props.annotation);
  autoUpdateResolution();
});

const isStaticContent = computed(
  () =>
    activeTransform.value?.annotationId !== props.annotation.id &&
    editableAnnotationId.value !== props.annotation.id,
);

const { showFocus, showSelectionPlane, showTransformControls } =
  useAnnotationSelection({
    annotation: toRef(props, "annotation"),
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

const onTransformChange = ({ bounds }: { bounds: Bounds }) => {
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

const { isSelectionPreviewShown } = useSelectionPreview({
  objectId: props.annotation.id,
  eventNameResolver: () =>
    `annotation-selection-preview-${props.annotation.id}`,
  isObjectSelected: isAnnotationSelected,
});
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
    <TransformControls
      :initial-value="annotation.bounds"
      :show-transform-controls="showTransformControls"
      :show-focus="showFocus"
      :show-selection="showSelectionPlane || isSelectionPreviewShown"
      @on-bounds-change="onTransformChange"
      @transform-end="onTransformEnd($event.bounds)"
    />

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
      :renderable="activeTransform?.annotationId !== annotation.id"
      :width="annotation.bounds.width"
      :height="annotation.bounds.height"
    />
  </Container>
</template>
