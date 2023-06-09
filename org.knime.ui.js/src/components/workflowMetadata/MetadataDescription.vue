<script setup lang="ts">
import RichTextEditor from "webapps-common/ui/components/RichTextEditor";

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
    <RichTextEditor
      compact
      :editable="editable"
      :initial-value="description || 'No description has been set yet'"
      :class="['description-editor', { editable }]"
      :max-height="300"
      :disabled-tools="{ textAlign: true }"
      @change="emit('change', $event)"
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

  &.editable {
    border: 1px solid var(--knime-masala);
  }
}
</style>
