<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import {
  type ComponentPublicInstance,
  onMounted,
  toRef,
  useTemplateRef,
  watch,
} from "vue";
import { onClickOutside, useMagicKeys } from "@vueuse/core";
import { storeToRefs } from "pinia";

import { navigatorUtils, sleep } from "@knime/utils";

import type { WorkflowAnnotation } from "@/api/gateway-api/generated-api";
import { useEscapeStack } from "@/composables/useEscapeStack";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import RichTextAnnotation from "../../common/annotations/RichTextAnnotation.vue";
import { useAnnotationDataEditing } from "../../common/annotations/useAnnotationDataEditing";

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
