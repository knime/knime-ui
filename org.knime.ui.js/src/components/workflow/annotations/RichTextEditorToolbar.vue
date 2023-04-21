<script setup lang="ts">
import { computed, type FunctionalComponent, type SVGAttributes } from 'vue';
import type { Editor } from '@tiptap/vue-3';

import FunctionButton from 'webapps-common/ui/components/FunctionButton.vue';
import BoldIcon from '@/assets/bold.svg';
import ItalicIcon from '@/assets/italic.svg';
import UnderlineIcon from '@/assets/underline.svg';
import BulletListIcon from '@/assets/unordered-list.svg';
import OrderedListIcon from '@/assets/ordered-list.svg';
import AlignLeftIcon from '@/assets/align-left.svg';
import AlignCenterIcon from '@/assets/align-center.svg';
import AlignRightIcon from '@/assets/align-right.svg';

interface Props {
    editor: Editor;
}

interface ToolbarItem {
    id: string;
    icon: FunctionalComponent<SVGAttributes>;
    onClick: () => void;
    active?: () => boolean;
}

const props = defineProps<Props>();

const tools: Array<ToolbarItem> = [
    {
        id: 'bold',
        icon: BoldIcon,
        active: () => props.editor.isActive('bold'),
        onClick: () => props.editor.chain().focus().toggleBold().run()
    },
    {
        id: 'italic',
        icon: ItalicIcon,
        active: () => props.editor.isActive('italic'),
        onClick: () => props.editor.chain().focus().toggleItalic().run()
    },
    {
        id: 'underline',
        icon: UnderlineIcon,
        active: () => props.editor.isActive('underline'),
        onClick: () => props.editor.chain().focus().toggleUnderline().run()
    },
    {
        id: 'bullet-list',
        icon: BulletListIcon,
        active: () => props.editor.isActive('bulletList'),
        onClick: () => props.editor.chain().focus().toggleBulletList().run()
    },
    {
        id: 'bullet-list-numbered',
        icon: OrderedListIcon,
        active: () => props.editor.isActive('orderedList'),
        onClick: () => props.editor.chain().focus().toggleOrderedList().run()
    },
    {
        id: 'align-left',
        icon: AlignLeftIcon,
        active: () => props.editor.isActive({ textAlign: 'left' }),
        onClick: () => props.editor.chain().focus().setTextAlign('left').run()
    },
    {
        id: 'align-center',
        icon: AlignCenterIcon,
        active: () => props.editor.isActive({ textAlign: 'center' }),
        onClick: () => props.editor.chain().focus().setTextAlign('center').run()
    },
    {
        id: 'align-right',
        icon: AlignRightIcon,
        active: () => props.editor.isActive({ textAlign: 'right' }),
        onClick: () => props.editor.chain().focus().setTextAlign('right').run()
    }
];

const totalTools = computed(() => tools.length);
</script>

<template>
  <div class="editor-toolbar">
    <FunctionButton
      v-for="tool of tools"
      :key="tool.icon"
      :active="tool.active ? tool.active() : false"
      class="toolbar-button"
      @click="tool.onClick"
    >
      <Component :is="tool.icon" />
    </FunctionButton>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.editor-toolbar {
    --padding: 8;
    --item-gap: 2;
    --item-size: 24;

    display: flex;
    gap: calc(var(--item-gap) * 1px);
    justify-content: center;
    background: var(--knime-white);
    padding: calc(var(--padding) * 1px);
    width: calc(
        calc(
            /* account for padding on both ends */
            var(--padding) * 2 +
            /* account for all items */
            v-bind(totalTools) * var(--item-size) +
            /* include gaps (total gaps = total items - 1) */
            var(--item-gap) * calc(v-bind(totalTools) - 1)
        )
        * 1px /* convert to px */
    );
    height: 40px;
    box-shadow: 0 0 10px rgb(62 58 57 / 30%);
    border-radius: 20px;

    & .toolbar-button {
        width: calc(var(--item-size) * 1px);
        height: calc(var(--item-size) * 1px);
        padding: 0;
        justify-content: center;
        align-items: center;

        & svg {
            /* overwrite style that sets a background for the svg canvas */
            background: transparent !important;
        }
    }
}
</style>
