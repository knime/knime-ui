<script setup lang="ts">
import {
  type ComponentPublicInstance,
  type UnwrapRef,
  computed,
  onMounted,
  ref,
  toRef,
  useTemplateRef,
  watch,
} from "vue";
import { onClickOutside, useMagicKeys } from "@vueuse/core";
import { storeToRefs } from "pinia";

import { navigatorUtils, sleep } from "@knime/utils";

import type {
  Bounds,
  WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import { useEscapeStack } from "@/composables/useEscapeStack";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { gridSize } from "@/style/shapes";
import { useAnnotationDataEditing } from "../../common/annotations/useAnnotationDataEditing";

import RichTextAnnotation from "./RichTextAnnotation.vue";

defineOptions({ inheritAttrs: false });

type Props = {
  annotation: WorkflowAnnotation;
};

const props = defineProps<Props>();

const selectionPreview = ref<"hide" | "show" | "clear" | null>(null);

const annotationInteractionStore = useAnnotationInteractionsStore();
const selectionStore = useSelectionStore();
const { singleSelectedAnnotation, singleSelectedObject, isAnnotationSelected } =
  storeToRefs(selectionStore);

const canvasStore = useWebGLCanvasStore();
const { zoomFactor } = storeToRefs(canvasStore);
const { focus: focusCanvas } = canvasStore;

const isSelected = computed(() =>
  isAnnotationSelected.value(props.annotation.id),
);

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

const richTextAnnotationRef =
  useTemplateRef<ComponentPublicInstance<typeof RichTextAnnotation>>(
    "richTextAnnotation",
  );

onMounted(async () => {
  // make a brief pause before registering the click outside handler,
  // to avoid closing immediately after opening
  // eslint-disable-next-line no-magic-numbers
  await sleep(300);

  onClickOutside(richTextAnnotationRef, saveContent, {
    ignore: [".editor-toolbar[data-ignore-click-outside]"],
    capture: true,
  });
});
</script>

<template>
  <RichTextAnnotation
    :id="annotation.id"
    ref="richTextAnnotation"
    :initial-value="initialRichTextAnnotationValue"
    :initial-border-color="initialBorderColor"
    :editable="isEditing"
    :annotation-bounds="annotation.bounds"
    :zoom-factor="zoomFactor"
    class="annotation"
    @change="onAnnotationTextChange"
    @change-border-color="onAnnotationColorChange"
    @edit-start="toggleEdit"
    @blur="onBlur"
  />
</template>

<style lang="postcss" scoped>
div {
  font-family: "Roboto Condensed", sans-serif;
  border-radius: 2px;
  cursor: pointer;
  user-select: none;
}
</style>
