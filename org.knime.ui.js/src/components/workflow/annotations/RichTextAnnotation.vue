<script setup lang="ts">
import { toRefs, ref, computed } from "vue";

import type { Bounds } from "@/api/gateway-api/generated-api";

import RichTextEditor from "webapps-common/ui/components/RichTextEditor";
import RichTextAnnotationToolbar from "./RichTextAnnotationToolbar.vue";
import { ControlClickLink, LinkRegex } from "./extended-link";

interface Props {
  id: string;
  editable: boolean;
  initialValue: string;
  annotationBounds: Bounds;
  isSelected: boolean;
  isDragging: boolean;
  initialBorderColor: string;
}

const props = defineProps<Props>();
const { initialValue } = toRefs(props);
const previewBorderColor = ref<string | null>(null);

// eslint-disable-next-line func-call-spacing
const emit = defineEmits<{
  (e: "editStart"): void;
  (e: "change", content: string): void;
  (e: "changeBorderColor", color: string): void;
}>();

const activeBorderColor = computed(
  () => previewBorderColor.value || props.initialBorderColor
);

const customExtensions = [
  ControlClickLink.configure({
    validate: (href) => LinkRegex.test(href),
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
      :initial-value="initialValue"
      :editable="editable"
      :custom-extensions="customExtensions"
      @change="emit('change', $event)"
      @dblclick="!editable && emit('editStart')"
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

  border: var(--border-width) solid v-bind("activeBorderColor");
}
</style>
