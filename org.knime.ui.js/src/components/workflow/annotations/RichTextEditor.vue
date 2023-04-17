<script setup lang="ts">
import { onMounted, nextTick, toRefs, watch } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import TextAlign from '@tiptap/extension-text-align';
import UnderLine from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';

import RichTextEditorToolbar from './RichTextEditorToolbar.vue';

const parseLegacyContent = (content: string) => content.replaceAll('\r\n', '<br />');

interface Props {
    id: string;
    editable: boolean;
    initialValue: string;
    isFirstEdit: boolean;
}

const props = defineProps<Props>();
const { initialValue } = toRefs(props);

// eslint-disable-next-line func-call-spacing
const emit = defineEmits<{
    (e: 'editStart'): void;
    (e: 'change', content: string): void;
}>();

const content = props.isFirstEdit
    ? parseLegacyContent(props.initialValue)
    : props.initialValue;

const editor = useEditor({
    content,
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

<style lang="postcss" scoped>
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
