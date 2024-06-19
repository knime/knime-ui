<script setup lang="ts">
import RichTextEditor from "webapps-common/ui/components/forms/RichTextEditor/RichTextEditor.vue";

import MetadataPlaceholder from "./MetadataPlaceholder.vue";

interface Props {
  originalDescription: string;
  editable?: boolean;
  modelValue?: string;
}

withDefaults(defineProps<Props>(), { modelValue: "", editable: false });

const emit = defineEmits<{
  "update:modelValue": [content: string];
}>();
</script>

<template>
  <div class="description">
    <MetadataPlaceholder
      v-if="!originalDescription && !editable"
      padded
      text="No description has been set yet"
    />

    <template v-else>
      <RichTextEditor
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
        autofocus
        :with-border="editable"
        @update:model-value="editable && emit('update:modelValue', $event)"
      />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.description {
  margin-bottom: 20px;
  font-size: 13px;
}

.description-editor {
  border: 1px solid transparent;
  --rich-text-editor-font-size: 13;

  &.editable {
    border: 1px solid var(--knime-masala);
  }

  &:not(.editable) {
    --rich-text-editor-padding: 0px;
  }
}
</style>
