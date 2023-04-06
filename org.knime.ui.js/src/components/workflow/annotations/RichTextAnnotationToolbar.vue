<script setup lang="ts">
import type { FunctionalComponent, SVGAttributes } from 'vue';
import type { Editor } from '@tiptap/vue-3';

import FunctionButton from 'webapps-common/ui/components/FunctionButton.vue';
import LinkIcon from '@/assets/link.svg';
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

const setLink = () => {
    const url = 'https://google.com';

    // update link
    props.editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
};

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
    },
    {
        id: 'link',
        icon: LinkIcon,
        active: () => props.editor.isActive('link'),
        onClick: () => setLink()
    }
];

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
    background: var(--knime-white);
    height: 40px;
    width: 250px;
    box-shadow: 0px 0px 10px rgba(62, 58, 57, 0.3);
    border-radius: 20px;

    padding: 8px;
    display: flex;
    gap: 2px;
    justify-content: center;

    & .toolbar-button {
        width: 24px;
        height: 24px;
        padding: 0;
        justify-content: center;
        align-items: center;

        & svg {
            background: transparent !important;
        }
    }
}
</style>
