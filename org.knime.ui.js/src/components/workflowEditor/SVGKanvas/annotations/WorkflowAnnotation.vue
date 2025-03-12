<script setup lang="ts">
import {
  type ComponentPublicInstance,
  type UnwrapRef,
  computed,
  onMounted,
  ref,
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
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $colors from "@/style/colors";
import { gridSize } from "@/style/shapes";
import { recreateLinebreaks } from "@/util/recreateLineBreaks";

import LegacyAnnotation from "./LegacyAnnotation.vue";
import RichTextAnnotation from "./RichTextAnnotation.vue";
import TransformControls from "./TransformControls.vue";

defineOptions({ inheritAttrs: false });

type Props = {
  annotation: WorkflowAnnotation;
};

const props = defineProps<Props>();

const selectionPreview = ref<"hide" | "show" | "clear" | null>(null);
const hasEdited = ref(false);
const newAnnotationData = ref({
  richTextContent: "",
  borderColor: "",
});

const { toggleContextMenu } = useCanvasAnchoredComponentsStore();
const annotationInteractionStore = useAnnotationInteractionsStore();
const { isDragging } = storeToRefs(useMovingStore());
const { isWritable } = storeToRefs(useWorkflowStore());
const selectionStore = useSelectionStore();
const {
  selectedNodeIds,
  getSelectedConnections: selectedConnections,
  selectedAnnotationIds,
  singleSelectedAnnotation,
  singleSelectedObject,
  shouldHideSelection,
  getFocusedObject,
  isAnnotationSelected,
} = storeToRefs(selectionStore);
const { focus: focusCanvas } = useSVGCanvasStore();

const isSelected = computed(() => {
  return isAnnotationSelected.value(props.annotation.id);
});

const isEditing = computed(() => {
  return (
    props.annotation.id === annotationInteractionStore.editableAnnotationId
  );
});

const showSelectionPlane = computed(() => {
  if (shouldHideSelection.value) {
    return false;
  }

  if (selectionPreview.value === null) {
    return isSelected.value;
  }

  if (isSelected.value && selectionPreview.value === "hide") {
    return false;
  }

  return selectionPreview.value === "show" || isSelected.value;
});

const showFocus = computed(() => {
  return getFocusedObject.value?.id === props.annotation.id;
});

const showTransformControls = computed(() => {
  if (isDragging.value || !isWritable.value) {
    return false;
  }

  const isMoreThanOneAnnotationSelected =
    selectedAnnotationIds.value.length > 1;
  const isOneOrMoreNodesSelected = selectedNodeIds.value.length >= 1;
  const isOneOrMoreConnectionsSelected = selectedConnections.value.length >= 1;

  let isMoreThanOneItemSelected =
    isMoreThanOneAnnotationSelected ||
    isOneOrMoreNodesSelected ||
    isOneOrMoreConnectionsSelected;

  return (
    isSelected.value && !isMoreThanOneItemSelected && showSelectionPlane.value
  );
});

const isRichTextAnnotation = computed(() => {
  return props.annotation.text.contentType === TypedText.ContentTypeEnum.Html;
});

const initialRichTextAnnotationValue = computed(() => {
  return isRichTextAnnotation.value
    ? props.annotation.text.value
    : recreateLinebreaks(props.annotation.text.value);
});

const initialBorderColor = computed(() => {
  if (
    hasEdited.value &&
    newAnnotationData.value.borderColor !== props.annotation.borderColor
  ) {
    return newAnnotationData.value.borderColor;
  }

  return isRichTextAnnotation.value
    ? props.annotation.borderColor
    : $colors.defaultAnnotationBorderColor;
});

const initializeData = () => {
  newAnnotationData.value = {
    richTextContent: initialRichTextAnnotationValue.value,
    borderColor: initialBorderColor.value,
  };
};

onMounted(() => {
  initializeData();
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

const onContextMenu = (event: PointerEvent) => {
  const metaOrCtrlKey = getMetaOrCtrlKey();
  const isMultiselect = event.shiftKey || event[metaOrCtrlKey];

  if (!isMultiselect && !isSelected.value) {
    selectionStore.deselectAllObjects();
  }

  selectionStore.selectAnnotation(props.annotation.id);
  toggleContextMenu({ event });
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

const toggleEdit = () => {
  if (!isWritable.value) {
    return;
  }

  if (isEditing.value) {
    focusCanvas();
  }

  annotationInteractionStore.setEditableAnnotationId(
    isEditing.value ? null : props.annotation.id,
  );
};

const updateAnnotation = () => {
  return annotationInteractionStore.updateAnnotation({
    annotationId: props.annotation.id,
    text: newAnnotationData.value.richTextContent,
    borderColor: newAnnotationData.value.borderColor,
  });
};

const saveContent = async () => {
  if (window.getSelection()?.toString() !== "" && isSelected.value) {
    return;
  }

  if (!isEditing.value) {
    return;
  }

  if (hasEdited.value) {
    await updateAnnotation();
  }

  toggleEdit();
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

// Blur happens on:
// - When the annotation exits the edit mode
// - Switching to another workflow (e.g clicking on another tab)
const onBlur = () => {
  if (hasEdited.value) {
    updateAnnotation();
  }
};

const onAnnotationChange = (content: string) => {
  hasEdited.value = true;
  newAnnotationData.value.richTextContent = content;
};

const setColor = (color: string) => {
  hasEdited.value = true;
  newAnnotationData.value.borderColor = color;
};
</script>

<template>
  <TransformControls
    ref="transformControlsRef"
    :show-transform-controls="showTransformControls"
    :show-selection="showSelectionPlane"
    :show-focus="showFocus"
    :initial-value="annotation.bounds"
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
          @change="onAnnotationChange"
          @change-border-color="setColor"
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
