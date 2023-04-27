<script setup lang="ts">
import { onMounted, nextTick, toRefs, watch } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import TextAlign from '@tiptap/extension-text-align';
import UnderLine from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';

import type { Bounds } from '@/api/gateway-api/generated-api';
import RichTextEditorToolbar from './RichTextEditorToolbar.vue';

interface Props {
    id: string;
    editable: boolean;
    initialValue: string;
    annotationBounds: Bounds;
    isSelected: boolean;
}

const props = defineProps<Props>();
const { initialValue } = toRefs(props);

// eslint-disable-next-line func-call-spacing
const emit = defineEmits<{
    (e: 'editStart'): void;
    (e: 'change', content: string): void;
}>();

const editor = useEditor({
    content: props.initialValue,
    editable: props.editable,
    extensions: [
        StarterKit,
        UnderLine,
        TextAlign.configure({
            types: ['heading', 'paragraph']
        })
    ],
    onUpdate: () => emit('change', editor.value.getHTML())
});

watch(initialValue, () => {
    editor.value.commands.setContent(initialValue.value);
});

onMounted(() => {
    if (props.editable) {
        nextTick(() => {
            editor.value.commands.focus();
        });
    }
});
</script>

<template>
  <div
    class="annotation-editor-wrapper"
    @pointerdown="editable && $event.stopPropagation()"
  >
    <Portal
      v-if="editable && editor"
      to="annotation-editor-toolbar"
    >
      <RichTextEditorToolbar
        :editor="editor"
        :annotation-bounds="annotationBounds"
      />
    </Portal>
    <EditorContent
      class="annotation-editor"
      :editor="editor"
      :class="{ editable, selected: isSelected }"
      @dblclick="!editable && emit('editStart')"
    />
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
    height: 100%;
    overflow-y: auto;
    border: 1px solid var(--knime-masala);

    &.editable {
        margin-top: 0;
        border: 1px solid var(--knime-cornflower);
        cursor: text;
    }

    &.selected {
        border-color: transparent;
    }

    /* stylelint-disable-next-line selector-class-pattern */
    & :deep(.ProseMirror) {
        height: 100%;
        font-size: 10px;
        padding: 10px;

        &:focus-visible,
        &:focus {
            outline: transparent;
        }

        & p {
            margin: 0;
            padding-bottom: 6px;
        }

        & ul,
        & ol {
            padding-left: 20px;
        }

        & a {
            color: var(--knime-cornflower);
        }
    }
}
</style>
