<script setup lang="ts">
import {
  onMounted,
  ref,
  computed,
  type UnwrapRef,
  watch,
  type ComponentPublicInstance,
} from "vue";
import { onClickOutside, useMagicKeys } from "@vueuse/core";

import { navigatorUtils } from "@knime/utils";
import type {
  Bounds,
  WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { TypedText } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import { gridSize } from "@/style/shapes";

import { useEscapeStack } from "@/mixins/escapeStack";
import { recreateLinebreaks } from "@/util/recreateLineBreaks";

import TransformControls from "./TransformControls.vue";
import LegacyAnnotation from "./LegacyAnnotation.vue";
import RichTextAnnotation from "./RichTextAnnotation.vue";

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

const store = useStore();

const editableAnnotationId = computed(
  () => store.state.workflow.editableAnnotationId,
);
const isDragging = computed(() => store.state.workflow.isDragging);

const isWritable = computed(() => store.getters["workflow/isWritable"]);

const selectedNodeIds = computed(
  () => store.getters["selection/selectedNodeIds"],
);
const selectedConnections = computed(
  () => store.getters["selection/selectedConnections"],
);
const selectedAnnotationIds = computed(
  () => store.getters["selection/selectedAnnotationIds"],
);
const singleSelectedAnnotation = computed(
  () => store.getters["selection/singleSelectedAnnotation"],
);
const singleSelectedObject = computed(
  () => store.getters["selection/singleSelectedObject"],
);

const isSelected = computed(() => {
  return store.getters["selection/isAnnotationSelected"](props.annotation.id);
});
const shouldHideSelection = computed(
  () => store.state.selection.shouldHideSelection,
);

const isEditing = computed(() => {
  return props.annotation.id === editableAnnotationId.value;
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
  return store.getters["selection/focusedObject"]?.id === props.annotation.id;
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

const onLeftClick = async (event: PointerEvent) => {
  const metaOrCtrlKey = navigatorUtils.getMetaOrCtrlKey();
  const isMultiselect = event.shiftKey || event[metaOrCtrlKey];

  await store.dispatch("selection/toggleAnnotationSelection", {
    annotationId: props.annotation.id,
    isMultiselect,
    isSelected: isSelected.value,
  });
};

const onContextMenu = (event: PointerEvent) => {
  const metaOrCtrlKey = navigatorUtils.getMetaOrCtrlKey();
  const isMultiselect = event.shiftKey || event[metaOrCtrlKey];

  if (!isMultiselect && !isSelected.value) {
    store.dispatch("selection/deselectAllObjects");
  }

  store.dispatch("selection/selectAnnotation", props.annotation.id);
  store.dispatch("application/toggleContextMenu", { event });
};

const setSelectionPreview = (type: UnwrapRef<typeof selectionPreview>) => {
  selectionPreview.value = type;
};

defineExpose({ setSelectionPreview });

const transformAnnotation = (bounds: Bounds) => {
  store.dispatch("workflow/transformWorkflowAnnotation", {
    bounds,
    annotationId: props.annotation.id,
  });
};

const toggleEdit = () => {
  if (!isWritable.value) {
    return;
  }

  if (isEditing.value) {
    store.dispatch("canvas/focus");
  }

  store.dispatch(
    "workflow/setEditableAnnotationId",
    isEditing.value ? null : props.annotation.id,
  );
};

const updateAnnotation = () => {
  return store.dispatch("workflow/updateAnnotation", {
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
