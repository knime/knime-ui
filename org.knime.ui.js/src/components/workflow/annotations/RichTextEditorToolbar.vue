<script setup lang="ts">
import { computed, type FunctionalComponent, type SVGAttributes } from 'vue';
import { useStore } from 'vuex';
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

import type { Bounds } from '@/api/gateway-api/generated-api';
import FloatingMenu from '@/components/common/FloatingMenu.vue';

import * as $shapes from '@/style/shapes.mjs';

interface Props {
    editor: Editor;
    annotationBounds: Bounds;
}

interface ToolbarItem {
    id: string;
    icon: FunctionalComponent<SVGAttributes>;
    onClick: () => void;
    active?: () => boolean;
}

const store = useStore();

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

const zoomFactor = computed(() => store.state.canvas.zoomFactor);

const toolbarItemPadding = 8;
const toolbarItemGap = 4;
const toolbarItemSize = 32;

const toolbarWidth =
    /* account for padding on both ends */
    toolbarItemPadding * 2 +
    /* account for all items */
    totalTools.value * toolbarItemSize +
    /* include gaps (total gaps = total items - 1) */
    toolbarItemGap * (totalTools.value - 1);

const adjustedPosition = computed(() => {
    // center X -> shift toolbar forward based on annotation width and then substract
    // half the width (accounting for the zoomfactor)
    const xOffset = props.annotationBounds.width / 2 - Math.ceil((toolbarWidth / 2) / zoomFactor.value);
    const x = props.annotationBounds.x + xOffset;

    // use same Y as annoation and add a negative Y offset equal to the toolbar height
    const y = props.annotationBounds.y - $shapes.annotationToolbarContainerHeight / zoomFactor.value;

    return {
        x,
        y
    };
});
</script>

<template>
  <FloatingMenu
    :canvas-position="adjustedPosition"
    aria-label="Annotation toolbar"
    :prevent-oveflow="true"
  >
    <div class="editor-toolbar">
      <FunctionButton
        v-for="tool of tools"
        :key="tool.icon"
        :active="tool.active ? tool.active() : false"
        class="toolbar-button"
        @click.stop="tool.onClick"
      >
        <Component :is="tool.icon" />
      </FunctionButton>
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.editor-toolbar {
    display: flex;
    justify-content: center;
    background: var(--knime-white);

    gap: calc(v-bind(toolbarItemGap) * 1px);
    padding: calc(v-bind(toolbarItemPadding) * 1px);
    width: calc(v-bind(toolbarWidth) * 1px);

    height: 48px;
    box-shadow: 0 0 10px rgb(62 58 57 / 30%);
    border-radius: 30px;

    & .toolbar-button {
        width: calc(v-bind(toolbarItemSize) * 1px);
        height: calc(v-bind(toolbarItemSize) * 1px);
        padding: 0;
        justify-content: center;
        align-items: center;

        & svg {
            /* overwrite style that sets a background for the svg canvas */
            background: transparent !important;

            width: calc(calc(v-bind(toolbarItemSize) - 5) * 1px);
            height: calc(calc(v-bind(toolbarItemSize) - 5) * 1px);
        }
    }
}
</style>
