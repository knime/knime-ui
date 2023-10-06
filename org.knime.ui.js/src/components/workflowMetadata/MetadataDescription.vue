<script setup lang="ts">
import { ref, watch, toRef, nextTick } from "vue";
import MetadataPlaceholder from "./MetadataPlaceholder.vue";

interface Props {
  originalDescription: string;
  editable?: boolean;
  modelValue?: string | null;
}

const editor = ref<HTMLTextAreaElement | null>(null);

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  editable: false,
});

defineEmits<{
  (e: "update:modelValue", content: string): void;
}>();

watch(toRef(props, "editable"), async (next) => {
  if (next) {
    await nextTick();
    editor.value.focus();
  }
});
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
      <div class="grow-wrap" :data-replicated-value="modelValue">
        <textarea
          ref="editor"
          :class="['description-editor', { editable }]"
          :readonly="!editable"
          :value="modelValue"
          @input="$emit('update:modelValue', ($event.target as any).value)"
        />
      </div>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.description {
  margin-bottom: 20px;
  font-size: 16px;

  & .description-editor {
    border: 1px solid transparent;
    --rich-text-editor-font-size: 13;

    width: 100%;
    min-height: 150px;
    resize: none;
    background-color: transparent;
    outline: transparent;
    line-height: 150%;
    font-size: 13px;

    &.editable {
      padding: 10px;
      border: 1px solid var(--knime-stone-gray);
      background-color: var(--knime-white);

      &:focus {
        border: 1px solid var(--knime-masala);
      }
    }
  }
}

.grow-wrap {
  /* easy way to plop the elements on top of each other and have them both sized based on the tallest one's height */
  display: grid;

  &::after {
    /* Note the weird space! Needed to prevent jumpy behavior */
    content: attr(data-replicated-value) " ";
    max-width: 320px;

    /* This is how textarea text behaves */
    white-space: pre-wrap;

    /* Hidden from view, clicks, and screen readers */
    visibility: hidden;
  }

  & > textarea {
    resize: none;

    /* Firefox shows scrollbar on growth, you can hide like this. */
    overflow: hidden;
    color: var(--knime-masala);
  }

  & > textarea,
  &::after {
    border: 1px solid transparent;
    padding: 0.5rem;
    font: inherit;

    /* Place on top of each other */
    grid-area: 1 / 1 / 2 / 2;
  }
}
</style>
