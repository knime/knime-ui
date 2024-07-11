<script setup lang="ts">
import { ref, computed, toRefs } from "vue";

import { RichTextEditor } from "@knime/rich-text-editor";

import type { Bounds } from "@/api/gateway-api/generated-api";
import { buildUrlRegex } from "@/util/regex";

import RichTextAnnotationToolbar from "./RichTextAnnotationToolbar.vue";
import { ControlClickLink } from "./extended-link";

const URL_REGEX = buildUrlRegex();

interface Props {
  id: string;
  editable: boolean;
  initialValue: string;
  annotationBounds: Bounds;
  initialBorderColor: string;
}

const props = defineProps<Props>();
const { initialValue } = toRefs(props);
const previewBorderColor = ref<string | null>(null);

const emit = defineEmits<{
  (e: "editStart"): void;
  (e: "change", content: string): void;
  (e: "changeBorderColor", color: string): void;
  (e: "blur"): void;
}>();

const activeBorderColor = computed(
  () => previewBorderColor.value || props.initialBorderColor,
);

const customExtensions = [
  ControlClickLink.configure({
    validate: (href) => URL_REGEX.test(href),
  }),
];
</script>

<template>
  <div
    class="annotation-editor-wrapper"
    @pointerdown="editable && $event.stopPropagation()"
  >
    <RichTextEditor
      class="annotation-editor"
      :model-value="initialValue"
      :editable="editable"
      :with-border="false"
      :custom-extensions="customExtensions"
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
      }"
      @update:model-value="emit('change', $event)"
      @dblclick="!editable && emit('editStart')"
      @blur="emit('blur')"
    >
      <template #customToolbar="{ editor, tools }">
        <Portal v-if="editable && editor" to="annotation-editor-toolbar">
          <RichTextAnnotationToolbar
            :active-border-color="initialBorderColor"
            :editor="editor"
            :tools="tools"
            :annotation-bounds="annotationBounds"
            @change-border-color="emit('changeBorderColor', $event)"
            @preview-border-color="previewBorderColor = $event"
          />
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

.toolbar-wrapper {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: initial;
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
</style>
