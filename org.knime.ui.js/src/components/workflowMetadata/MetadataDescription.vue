<script setup lang="ts">
import RichTextEditor from "webapps-common/ui/components/forms/RichTextEditor/RichTextEditor.vue";

import MetadataPlaceholder from "./MetadataPlaceholder.vue";

interface Props {
  modelValue: string | null;
  editable?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: "update:modelValue", content: string): void;
}>();
</script>

<template>
  <div class="description">
    <MetadataPlaceholder
      v-if="!modelValue && !editable"
      padded
      text="No description has been set yet"
    />

    <RichTextEditor
      v-else
      :editable="editable"
      :model-value="modelValue"
      :class="['description-editor', { editable }]"
      :min-height="150"
      :base-extensions="{
        bold: true,
        italic: true,
        bulletList: true,
        orderedList: true,
        underline: true,
      }"
      :with-border="editable"
      @update:model-value="editable && emit('update:modelValue', $event)"
    />
  </div>
</template>

<style lang="postcss" scoped>
.description {
  margin-bottom: 20px;
  font-size: 16px;
}

.description-editor {
  border: 1px solid transparent;
  --rich-text-editor-font-size: 16;

  &.editable {
    border: 1px solid var(--knime-masala);
  }

  &:not(.editable) {
    --rich-text-editor-padding: 0px;
  }
}
</style>
