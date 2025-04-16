<script setup lang="ts">
import {
  type ComponentPublicInstance,
  type UnwrapRef,
  computed,
  ref,
  toRef,
  watch,
} from "vue";
import { onClickOutside, useMagicKeys } from "@vueuse/core";
import { storeToRefs } from "pinia";

import { getMetaOrCtrlKey, navigatorUtils } from "@knime/utils";

import type {
  Bounds,
  WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import { TypedText } from "@/api/gateway-api/generated-api";
import { useEscapeStack } from "@/composables/useEscapeStack";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { gridSize } from "@/style/shapes";
import RichTextAnnotation from "../../common/annotations/RichTextAnnotation.vue";
import { useAnnotationDataEditing } from "../../common/annotations/useAnnotationDataEditing";
import { useAnnotationSelection } from "../../common/annotations/useAnnotationSelection";

import LegacyAnnotation from "./LegacyAnnotation.vue";
import TransformControls from "./TransformControls.vue";

defineOptions({ inheritAttrs: false });

type Props = {
  annotation: WorkflowAnnotation;
};

const props = defineProps<Props>();

const { toggleContextMenu } = useCanvasAnchoredComponentsStore();
const annotationInteractionStore = useAnnotationInteractionsStore();
const selectionStore = useSelectionStore();
const { singleSelectedAnnotation, singleSelectedObject } =
  storeToRefs(selectionStore);
const canvasStore = useSVGCanvasStore();
const { zoomFactor } = storeToRefs(canvasStore);
const { focus: focusCanvas } = canvasStore;

const isSelected = computed(() => {
  return selectionStore.isAnnotationSelected(props.annotation.id);
});

const {
  isEditing,
  hasEdited,
  initialBorderColor,
  initialRichTextAnnotationValue,
  toggleEdit,
  saveContent,
  onBlur,
  onAnnotationColorChange,
  onAnnotationTextChange,
} = useAnnotationDataEditing({
  annotation: toRef(props, "annotation"),
  focusCanvas,
});

const {
  selectionPreview,
  showSelectionPlane,
  showTransformControls,
  showFocus,
} = useAnnotationSelection({
  annotation: toRef(props, "annotation"),
});

const isRichTextAnnotation = computed(() => {
  return props.annotation.text.contentType === TypedText.ContentTypeEnum.Html;
});

const onLeftClick = (event: PointerEvent) => {
  const metaOrCtrlKey = getMetaOrCtrlKey();
  const isMultiselect = event.shiftKey || event[metaOrCtrlKey];

  selectionStore.toggleAnnotationSelection({
    annotationId: props.annotation.id,
    isMultiselect,
    isSelected: isSelected.value,
  });
};

const onContextMenu = async (event: PointerEvent) => {
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

const setSelectionPreview = (type: UnwrapRef<typeof selectionPreview>) => {
  selectionPreview.value = type;
};

defineExpose({ setSelectionPreview });

const transformAnnotation = (bounds: Bounds) => {
  annotationInteractionStore.transformWorkflowAnnotation({
    bounds,
    annotationId: props.annotation.id,
  });
};

const transformControlsRef = ref<ComponentPublicInstance<
  typeof TransformControls
> | null>(null);

onClickOutside(transformControlsRef, saveContent, {
  ignore: [".editor-toolbar[data-ignore-click-outside]"],
  capture: false,
});

const keys = useMagicKeys();
const saveAnnotationKeys = [
  navigatorUtils.isMac() ? keys["Cmd+Enter"] : keys["Ctrl+Enter"],
];

watch(saveAnnotationKeys, ([wasPressed]) => {
  if (wasPressed && isEditing.value) {
    saveContent();
  }
});

useMagicKeys({
  passive: false,
  onEventFired: (event) => {
    const keys = [
      event.key === "ArrowUp",
      event.key === "ArrowDown",
      event.key === "ArrowLeft",
      event.key === "ArrowRight",
    ];

    if (
      event.type !== "keydown" ||
      !event.altKey ||
      !keys.includes(true) ||
      isEditing.value ||
      !isSelected.value ||
      !singleSelectedAnnotation.value ||
      !singleSelectedObject.value
    ) {
      return;
    }

    event.preventDefault();

    const [isUp, isDown, isLeft, isRight] = keys;

    const TRANSFORM_AMOUNT = gridSize.x * 2;
    const delta = isUp || isLeft ? -1 : 1;
    const isXAxis = isLeft || isRight;
    const isYAxis = isUp || isDown;

    const nextWidth = Math.max(
      props.annotation.bounds.width + TRANSFORM_AMOUNT * delta,
      0,
    );
    const nextHeight = Math.max(
      props.annotation.bounds.height + TRANSFORM_AMOUNT * delta,
      0,
    );

    const nextBounds: Bounds = {
      x: props.annotation.bounds.x,
      y: props.annotation.bounds.y,
      width: isXAxis ? nextWidth : props.annotation.bounds.width,
      height: isYAxis ? nextHeight : props.annotation.bounds.height,
    };

    transformAnnotation(nextBounds);
  },
});

useEscapeStack({
  onEscape: () => {
    hasEdited.value = false;

    if (isEditing.value) {
      toggleEdit();
    }
  },
});
</script>

<template>
  <TransformControls
    ref="transformControlsRef"
    :show-transform-controls="showTransformControls"
    :show-selection="showSelectionPlane"
    :show-focus="showFocus"
    :initial-value="annotation.bounds"
    :is-annotation-selected="isSelected"
    @transform-end="transformAnnotation($event.bounds)"
    @click="onLeftClick"
    @pointerdown.right.stop="onContextMenu"
    @pointerdown.left.ctrl.stop="
      navigatorUtils.isMac() ? onContextMenu($event) : null
    "
  >
    <template #default="{ transformedBounds }">
      <foreignObject
        :x="transformedBounds.x"
        :y="transformedBounds.y"
        :width="transformedBounds.width"
        :height="transformedBounds.height"
        data-test-id="transformed-controls"
      >
        <LegacyAnnotation
          v-if="!isRichTextAnnotation && !isEditing"
          :annotation="annotation"
          @edit-start="toggleEdit"
        />

        <RichTextAnnotation
          v-if="isRichTextAnnotation || isEditing"
          :id="annotation.id"
          :initial-value="initialRichTextAnnotationValue"
          :initial-border-color="initialBorderColor"
          :editable="isEditing"
          :annotation-bounds="transformedBounds"
          :zoom-factor="zoomFactor"
          canvas-renderer="SVG"
          @change="onAnnotationTextChange"
          @change-border-color="onAnnotationColorChange"
          @edit-start="toggleEdit"
          @blur="onBlur"
        />
      </foreignObject>
    </template>
  </TransformControls>
</template>

<style lang="postcss" scoped>
div {
  font-family: "Roboto Condensed", sans-serif;
  border-radius: 2px;
  cursor: pointer;
  user-select: none;
}
</style>
