<script setup lang="ts">
import { onMounted, nextTick, toRefs, watch } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';

interface Props {
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
        StarterKit
    ],
    onUpdate: () => emit('update:modelValue', editor.value.getHTML())
});

watch(initialValue, () => {
    editor.value.commands.setContent(initialValue.value);
});

onMounted(() => {
    // TODO: keep?
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
  <EditorContent
    class="editor"
    :editor="editor"
    :class="{ editable: props.editable }"
    @dblclick="emit('editStart')"
  />
</template>

<style lang="postcss">
.editor {
    height: 100%;
    background: white;
    border: 1px solid var(--knime-cornflower);

    &.editable {
        border-color: transparent;
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
    }
}
</style>
