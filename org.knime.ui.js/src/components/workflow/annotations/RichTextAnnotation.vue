<script setup lang="ts">
import { onMounted, nextTick, toRefs, watch } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import TextAlign from '@tiptap/extension-text-align';
import UnderLine from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';

import RichTextAnnotationToolbar from './RichTextAnnotationToolbar.vue';

interface Props {
    editable: boolean;
    initialValue: string;
    modelValue: string;
    topOffset: number;
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
        Link.configure({
            HTMLAttributes: {
                rel: 'noreferrer',
                target: null
            }
        }),
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
            editor.value.commands.focus('end');
        });
    }
});
</script>

<template>
  <div
    class="editor-wrapper"
    @pointerdown.stop
  >
    <RichTextAnnotationToolbar
      v-if="editable && editor"
      :top-offset="topOffset"
      :editor="editor"
    />
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

.editor {
    background: var(--knime-white);
    margin-top: calc(v-bind(topOffset) * 1px);
    height: calc(100% - calc(v-bind(topOffset) * 1px));
    overflow-y: auto;
    border: 1px solid var(--knime-cornflower);

    &.editable {
        /* border-color: transparent; */
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
