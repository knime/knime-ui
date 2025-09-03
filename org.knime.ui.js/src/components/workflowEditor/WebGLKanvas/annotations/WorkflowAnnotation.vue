<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import {
  type ComponentPublicInstance,
  ref,
  toRef,
  useTemplateRef,
  watch,
} from "vue";
import { onKeyDown, useMagicKeys } from "@vueuse/core";
import { storeToRefs } from "pinia";

import { navigatorUtils } from "@knime/utils";

import type { WorkflowAnnotation } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import RichTextAnnotation from "../../common/annotations/RichTextAnnotation.vue";
import { useAnnotationDataEditing } from "../../common/annotations/useAnnotationDataEditing";
import { useCanvasClickOutside } from "../common/useCanvasClickOutside";

defineOptions({ inheritAttrs: false });

type Props = {
  annotation: WorkflowAnnotation;
};

const props = defineProps<Props>();

const canvasStore = useWebGLCanvasStore();
const { zoomFactor } = storeToRefs(canvasStore);
const { focus: focusCanvas } = canvasStore;

const {
  isEditing,
  hasEdited,
  initialBorderColor,
  initialRichTextAnnotationValue,
  toggleEdit,
  saveContent,
  onAnnotationColorChange,
  onAnnotationTextChange,
} = useAnnotationDataEditing({
  annotation: toRef(props, "annotation"),
  focusCanvas,
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

const richTextAnnotationRef =
  useTemplateRef<ComponentPublicInstance<typeof RichTextAnnotation>>(
    "richTextAnnotation",
  );

onKeyDown(
  "Escape",
  () => {
    hasEdited.value = false;

    if (isEditing.value) {
      toggleEdit();
    }
  },
  { target: () => richTextAnnotationRef.value?.$el },
);

useCanvasClickOutside({
  rootEl: richTextAnnotationRef,
  focusTrap: ref(false),
  ignoreCssSelectors: [
    ".editor-toolbar[data-ignore-click-outside]",
    // The portal target is using this as an ID for the toolbar
    "#annotation-editor-toolbar",
  ],
  ignoreCanvasEvents: (event) =>
    event.dataset?.initiator === "annotation-transform",
  onClickOutside: saveContent,
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
    :data-test-id="`workflow-annotation-${annotation.id}`"
    canvas-renderer="WebGL"
    @change="onAnnotationTextChange"
    @change-border-color="onAnnotationColorChange"
    @edit-start="toggleEdit"
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
