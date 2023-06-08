<script setup lang="ts">
import { onMounted, toRefs, useSlots, watch } from "vue";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import TextAlign from "@tiptap/extension-text-align";
import UnderLine from "@tiptap/extension-underline";
import { ControlClickLink, LinkRegex } from "./extended-link";
import StarterKit from "@tiptap/starter-kit";

import RichTextEditorBaseToolbar from "./RichTextEditorBaseToolbar.vue";
import RichTextEditorToolbar from "./RichTextEditorToolbar.vue";

interface Props {
  initialValue: string;
  editable?: boolean;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  editable: true,
  compact: false,
});

const slots = useSlots();
const { initialValue, editable } = toRefs(props);

const emit = defineEmits<{
  (e: "change", content: string): void;
}>();

const editor = useEditor({
  content: props.initialValue,
  editable: props.editable,
  extensions: [
    StarterKit,
    UnderLine,
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    ControlClickLink.configure({
      validate: (href) => LinkRegex.test(href),
    }),
  ],
  onUpdate: () => emit("change", editor.value.getHTML()),
});

watch(initialValue, () => {
  editor.value.commands.setContent(initialValue.value);
});

watch(editable, (value) => {
  editor.value.setEditable(value);
});

onMounted(async () => {
  if (props.editable) {
    await new Promise((r) => setTimeout(r, 0));
    editor.value.commands.focus();
  }
});

const hasCustomToolbar = slots.customToolbar;
</script>

<template>
  <div class="editor-wrapper">
    <Transition name="expand" :css="!hasCustomToolbar">
      <div
        v-if="editor && editable"
        :class="{ 'embedded-toolbar': !hasCustomToolbar }"
      >
        <RichTextEditorBaseToolbar :editor="editor">
          <template #default="{ tools }">
            <slot name="customToolbar" :editor="editor" :tools="tools">
              <RichTextEditorToolbar :editor="editor" :tools="tools" />
            </slot>
          </template>
        </RichTextEditorBaseToolbar>
      </div>
    </Transition>

    <EditorContent
      class="rich-text-editor"
      :editor="editor"
      :class="{ editable }"
    />

    <RichTextEditorBaseToolbar :editor="editor">
      <template #default="{ tools }">
        <slot name="customToolbar" :editor="editor" :tools="tools" />
      </template>
    </RichTextEditorBaseToolbar>
  </div>
</template>

<style lang="postcss" scoped>
.editor-wrapper {
  height: 100%;
}

.embedded-toolbar {
  height: 40px;
  border-bottom: 1px solid var(--knime-silver-sand);
  overscroll-behavior: contain;
  padding: 4px;
  background: var(--knime-white);
  overflow-x: auto;
  white-space: pre;
  -ms-overflow-style: none; /* needed to hide scroll bar in edge */
  scrollbar-width: none; /* for firefox */
  &::-webkit-scrollbar {
    display: none;
  }
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.5s ease;
}

.expand-enter-from,
.expand-leave-to {
  height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  height: 40px;
  opacity: 1;
}

.rich-text-editor {
  height: 100%;
  max-height: 300px;
  overflow-y: auto;

  &.editable {
    cursor: text;
    background: var(--knime-white);
  }

  /* stylelint-disable-next-line selector-class-pattern */
  & :deep(.ProseMirror) {
    height: 100%;
    font-size: 12px;
    padding: v-bind("compact ? '4px' : '16px'");
    color: var(--knime-black);

    &:focus-visible,
    &:focus {
      outline: transparent;
    }

    & p {
      margin: 0 0 6px;
      padding: 0;
      line-height: 1.44;
    }

    & blockquote {
      margin: 0 0 6px 12px;
      position: relative;

      &::before {
        position: absolute;
        content: "";
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
      margin: 32px 0 16px;
    }

    & h2 {
      font-size: 36px;
      margin: 24px 0 12px;
    }

    & h3 {
      font-size: 30px;
      margin: 20px 0 10px;
    }

    & h4 {
      font-size: 24px;
      margin: 16px 0 8px;
    }

    & h5 {
      font-size: 18px;
      margin: 12px 0 6px;
    }

    & h6 {
      font-size: 15px;
      margin: 10px 0 5px;
    }

    & h1:first-child,
    & h2:first-child,
    & h3:first-child,
    & h4:first-child,
    & h5:first-child,
    & h6:first-child {
      margin-top: 0;
    }

    & hr {
      border: none;
      border-top: 1px solid var(--knime-silver-sand);
      margin: 6px 0;
    }

    & :not(pre) > code {
      padding: 0 2px;
      font-family: "Roboto Mono", monospace;
      border: 1px solid var(--knime-silver-sand);
      background: var(--knime-gray-light-semi);
      box-decoration-break: clone;
    }

    & pre {
      background: var(--knime-gray-light-semi);
      border: 1px solid var(--knime-silver-sand);
      font-family: "Roboto Mono", monospace;
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

      &:first-child {
        margin-top: 0;
      }
    }

    & a {
      color: var(--theme-text-link-foreground-color);
      text-decoration-style: dashed;

      &:hover {
        text-decoration-style: solid;
        background: var(--theme-text-link-background-color-hover);
        color: var(--theme-text-link-foreground-color-hover);
      }
    }
  }
}
</style>
