<script setup lang="ts">
import RichTextEditor from "webapps-common/ui/components/forms/RichTextEditor/RichTextEditor.vue";

import MetadataPlaceholder from "./MetadataPlaceholder.vue";

interface Props {
  originalDescription: string;
  editable?: boolean;
  modelValue?: string | null;
}

withDefaults(defineProps<Props>(), { modelValue: "", editable: false });

const emit = defineEmits<{
  (e: "update:modelValue", content: string): void;
}>();
</script>

<template>
  <div class="description">
    <MetadataPlaceholder
      v-if="!originalDescription && !editable"
      padded
      text="No description has been set yet"
    />

    <!--
      Editors have internal state. Without destroying them and recreating them
      we could end up with incorrect descriptions set by the internal component's
      modelValue when switching between workflow tabs
    -->
    <template v-else>
      <RichTextEditor
        v-if="editable"
        editable
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

      <RichTextEditor
        v-else
        :editable="false"
        :model-value="originalDescription"
        :class="['description-editor']"
        :min-height="150"
        :with-border="false"
      />
    </template>
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
