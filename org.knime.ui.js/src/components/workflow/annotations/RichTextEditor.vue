<script setup lang="ts">
import { onMounted, nextTick, toRefs, watch } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import TextAlign from '@tiptap/extension-text-align';
import UnderLine from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';

import RichTextEditorToolbar from './RichTextEditorToolbar.vue';

interface Props {
    id: string;
    editable: boolean;
    initialValue: string;
    modelValue: string;
}

const props = defineProps<Props>();
const { initialValue } = toRefs(props);

// eslint-disable-next-line func-call-spacing
const emit = defineEmits<{
    (e: 'change'): void;
    (e: 'editStart'): void;
    (e: 'update:modelValue', content: string): void;
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
    onUpdate: () => emit('update:modelValue', editor.value.getHTML())
});

watch(initialValue, () => {
    editor.value.commands.setContent(initialValue.value);
});

onMounted(() => {
    editor.value.on('update', () => {
        emit('change');
    });

    if (props.editable) {
        nextTick(() => {
            editor.value.commands.focus();
        });
    }
});
</script>

<template>
  <div
    class="editor-wrapper"
    @pointerdown="editable && $event.stopPropagation()"
  >
    <Portal
      v-if="editable && editor"
      :to="`editor-toolbar-${id}`"
    >
      <div class="toolbar-wrapper">
        <RichTextEditorToolbar :editor="editor" />
      </div>
    </Portal>
    <EditorContent
      class="editor"
      :editor="editor"
      :class="{ editable: props.editable }"
      @dblclick="!editable && emit('editStart')"
    />
  </div>
</template>

<style lang="postcss">
.editor-wrapper {
    height: 100%;
}

.toolbar-wrapper {
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.editor {
    background: var(--knime-white);
    height: 100%;
    overflow-y: auto;
    border: 1px solid var(--knime-cornflower);
    border-radius: calc(v-bind("$shapes.selectedItemBorderRadius") * 1px);

    &.editable {
        margin-top: 0;
        cursor: text;
    }

    & .ProseMirror {
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
