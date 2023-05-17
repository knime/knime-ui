<script setup lang="ts">
import { onMounted, nextTick, toRefs, watch, ref } from 'vue';
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
    isDragging: boolean;
    borderColor: string;
}

const props = defineProps<Props>();
const { initialValue } = toRefs(props);
const borderPreview = ref<string | null>(null);

// eslint-disable-next-line func-call-spacing
const emit = defineEmits<{
    (e: 'editStart'): void;
    (e: 'change', content: string): void;
    (e: 'changeBorderColor', color: string): void;
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
        :active-border-color="borderColor"
        :editor="editor"
        :annotation-bounds="annotationBounds"
        @change-border-color="emit('changeBorderColor', $event)"
        @preview-border-color="borderPreview = $event"
      />
    </Portal>
    <EditorContent
      class="annotation-editor"
      :editor="editor"
      :class="{
        editable,
        selected: isSelected,
        'is-dragging': isDragging,
        'border-preview': Boolean(borderPreview)
      }"
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
    --border-width: 2px;
    --border-color: v-bind("borderColor");

    height: 100%;
    overflow-y: auto;
    border: var(--border-width) solid var(--border-color);

    &.editable {
        cursor: text;
    }

    &.border-preview,
    &.editable.border-preview {
        --border-color: v-bind("borderPreview");
    }

    /* stylelint-disable-next-line selector-class-pattern */
    & :deep(.ProseMirror) {
        height: 100%;
        font-size: 12px;
        padding: 10px;
        color: var(--knime-black);

        &:focus-visible,
        &:focus {
            outline: transparent;
        }

        & p {
            margin: 0;
            padding-bottom: 6px;
            line-height: 1.44;
        }

        & blockquote {
            margin: 0 0 6px 12px;
            position: relative;

            &::before {
                position: absolute;
                content: '';
                left: -12px;
                height: 100%;
                width: 4px;
                background-color: var(--knime-silver-sand);
                border-radius: 4px;
            }

            & p:last-child {
                padding-bottom: 0;
            }
        }

        & h1 {
            font-size: 48px;
        }

        & h2 {
            font-size: 36px;
        }

        & h3 {
            font-size: 30px;
        }

        & h4 {
            font-size: 24px;
        }

        & h5 {
            font-size: 18px;
        }

        & h6 {
            font-size: 15px;
        }

        & h1:first-of-type,
        & h2:first-of-type,
        & h3:first-of-type,
        & h4:first-of-type,
        & h5:first-of-type,
        & h6:first-of-type
        {
            margin-top: 0;
        }

        & hr {
            border: none;
            border-top: 1px solid var(--knime-silver-sand);
            margin: 6px 0;
        }

        & :not(pre) > code {
            padding: 0 2px;
            font-family: 'Roboto Mono', monospace;
            border: 1px solid var(--knime-silver-sand);
            background: var(--knime-gray-light-semi);
            box-decoration-break: clone;
        }

        & pre {
            background: var(--knime-gray-light-semi);
            border: 1px solid var(--knime-silver-sand);
            font-family: 'Roboto Mono', monospace;
            padding: 8px 12px;
            line-height: 1.44;

            & > code {
                color: inherit;
                padding: 0;
                background: none;
            }
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
