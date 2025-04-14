<script setup lang="ts">
import { computed, ref, toRefs } from "vue";

import { CreateLinkModal, RichTextEditor } from "@knime/rich-text-editor";

import type { Bounds } from "@/api/gateway-api/generated-api";
import RichTextAnnotationToolbar from "../../common/annotations/RichTextAnnotationToolbar.vue";
import type { CanvasRendererType } from "../../util/canvasRenderer";

interface Props {
  id: string;
  editable: boolean;
  initialValue: string;
  annotationBounds: Bounds;
  initialBorderColor: string;
  canvasRenderer: CanvasRendererType;
  zoomFactor: number;
}

const props = defineProps<Props>();
const { initialValue } = toRefs(props);
const previewBorderColor = ref<string | null>(null);

const emit = defineEmits<{
  editStart: [];
  change: [content: string];
  changeBorderColor: [color: string];
  blur: [];
}>();

const activeBorderColor = computed(
  () => previewBorderColor.value || props.initialBorderColor,
);

const isBrowserWebKit = computed(
  () =>
    Boolean(navigator.userAgent.match(/WebKit/i)) &&
    !navigator.userAgent.match(/Chrome/i),
);
</script>

<template>
  <div
    class="annotation-editor-wrapper"
    aria-label="Edit annotation"
    @pointerdown="editable && $event.stopPropagation()"
  >
    <RichTextEditor
      :class="{ 'webkit-style': isBrowserWebKit }"
      class="annotation-editor"
      :model-value="initialValue"
      :editable="editable"
      :with-border="false"
      aria-label="Workflow annotation editor"
      autofocus
      :base-extensions="{
        bold: true,
        italic: true,
        underline: true,
        textAlign: true,
        bulletList: true,
        orderedList: true,
        heading: true,
        horizontalRule: true,
        strike: true,
        link: true,
      }"
      :character-limit="$characterLimits.workflowAnnotations"
      @update:model-value="emit('change', $event)"
      @dblclick="!editable && emit('editStart')"
      @blur="emit('blur')"
    >
      <template #customToolbar="{ editor, tools }">
        <Component
          :is="canvasRenderer === 'SVG' ? 'Portal' : 'div'"
          v-if="editable && editor"
          to="annotation-editor-toolbar"
        >
          <RichTextAnnotationToolbar
            :class="{ 'toolbar-webgl': canvasRenderer === 'WebGL' }"
            :active-border-color="initialBorderColor"
            :editor="editor"
            :tools="tools"
            :annotation-bounds="annotationBounds"
            @change-border-color="emit('changeBorderColor', $event)"
            @preview-border-color="previewBorderColor = $event"
          />
        </Component>
      </template>
      <template #linkModal="{ linkTool }">
        <Portal v-if="editable && linkTool" to="annotation-editor-toolbar">
          <CreateLinkModal v-bind="linkTool.props" v-on="linkTool.events" />
        </Portal>
      </template>
    </RichTextEditor>
  </div>
</template>

<style lang="postcss" scoped>
.annotation-editor-wrapper {
  height: 100%;
  background: var(--knime-white);
}

.toolbar-webgl {
  position: absolute;
  top: -60px;
  left: 50%;
  translate: -50%;
  z-index: v-bind("$zIndices.layerExpandedMenus");

  /* undo the transform applied to the parent */
  transform: scale(v-bind(1 / zoomFactor));
  transform-origin: bottom center;
}

.annotation-editor {
  --border-width: 2px;

  height: 100%;
  border: var(--border-width) solid v-bind("activeBorderColor");

  & :deep(a) {
    &::after {
      display: none !important;
    }
  }
}

.webkit-style {
  /* stylelint-disable-next-line selector-class-pattern */
  & :deep(.ProseMirror) {
    position: static !important;
  }
}
</style>
