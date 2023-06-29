<script setup lang="ts">
import RichTextEditor from "webapps-common/ui/components/forms/RichTextEditor/RichTextEditor.vue";

import MetadataPlaceholder from "./MetadataPlaceholder.vue";

interface Props {
  description: string | null;
  editable?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: "change", content: string): void;
}>();
</script>

<template>
  <div class="description">
    <MetadataPlaceholder
      v-if="!description && !editable"
      padded
      text="No description has been set"
    />

    <RichTextEditor
      v-else
      :editable="editable"
      :model-value="description"
      :class="['description-editor', { editable }]"
      :min-height="150"
      :max-height="300"
      :base-extensions="{
        bold: true,
        italic: true,
        bulletList: true,
        orderedList: true,
        underline: true,
        strike: true,
        horizontalRule: true,
      }"
      :with-border="editable"
      @update:model-value="emit('change', $event)"
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
