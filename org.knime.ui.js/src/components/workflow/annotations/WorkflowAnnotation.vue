<script setup lang="ts">
import { onMounted, ref, computed, type UnwrapRef, watch } from "vue";
import { directive as vClickAway } from "vue3-click-away";
import { useMagicKeys } from "@vueuse/core";

import { getMetaOrCtrlKey, isMac } from "webapps-common/util/navigator";
import type {
  Bounds,
  WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { TypedText } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors.mjs";

import { recreateLinebreaks } from "@/util/recreateLineBreaks";

import TransformControls from "./TransformControls.vue";
import LegacyAnnotation from "./LegacyAnnotation.vue";
import RichTextAnnotation from "./RichTextAnnotation.vue";
import { useEscapeStack } from "@/mixins/escapeStack";

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

const isAnnotationSelected = computed<(id: string) => boolean>(
  () => store.getters["selection/isAnnotationSelected"],
);
const selectedNodeIds = computed(
  () => store.getters["selection/selectedNodeIds"],
);
const selectedConnections = computed(
  () => store.getters["selection/selectedConnections"],
);
const selectedAnnotationIds = computed(
  () => store.getters["selection/selectedAnnotationIds"],
);

const isSelected = computed(() => {
  return isAnnotationSelected.value(props.annotation.id);
});

const isEditing = computed(() => {
  return props.annotation.id === editableAnnotationId.value;
});

const showSelectionPlane = computed(() => {
  if (isDragging.value) {
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
  const metaOrCtrlKey = getMetaOrCtrlKey();
  const isMultiselect = event.shiftKey || event[metaOrCtrlKey];

  await store.dispatch("selection/toggleAnnotationSelection", {
    annotationId: props.annotation.id,
    isMultiselect,
    isSelected: isSelected.value,
  });
};

const onContextMenu = (event: PointerEvent) => {
  const metaOrCtrlKey = getMetaOrCtrlKey();
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

const keys = useMagicKeys();
const saveAnnotationKeys = [
  keys["Ctrl+Enter"],
  isMac() ? keys["Cmd+Enter"] : null,
].filter(Boolean);

watch(saveAnnotationKeys, ([wasPressed]) => {
  if (wasPressed && isEditing.value) {
    saveContent();
  }
});

useEscapeStack({
  onEscape: () => {
    if (isEditing.value) {
      toggleEdit();
    }
  },
});

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
    v-click-away="() => saveContent()"
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
