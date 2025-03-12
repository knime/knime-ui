<script setup lang="ts">
import { computed, ref } from "vue";
import type { Level } from "@tiptap/extension-heading";
import type { Editor } from "@tiptap/vue-3";
import { storeToRefs } from "pinia";

import { FunctionButton, type MenuItem, SubMenu } from "@knime/components";
import type { EditorTools } from "@knime/rich-text-editor";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";
import MoreActionsIcon from "@knime/styles/img/icons/menu-options.svg";
import { type HotkeysNS, hotkeys } from "@knime/utils";

import type { Bounds } from "@/api/gateway-api/generated-api";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import * as $shapes from "@/style/shapes";
import FloatingMenu from "../FloatingMenu/FloatingMenu.vue";

import ColorIcon from "./ColorIcon.vue";
import ColorSelectionDialog from "./ColorSelectionDialog.vue";
import RichTextAnnotationToolbarDialog from "./RichTextAnnotationToolbarDialog.vue";

interface Props {
  editor: Editor;
  tools: EditorTools;
  annotationBounds: Bounds;
  activeBorderColor: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "previewBorderColor", color: string | null): void;
  (e: "changeBorderColor", color: string): void;
}>();

const primaryTools = computed(() =>
  props.tools.filter(({ secondary }) => !secondary),
);

const secondaryTools = computed(() =>
  props.tools.filter(({ secondary }) => secondary),
);

const secondaryToolsMenuItems = computed(() =>
  secondaryTools.value.map((tool) => ({
    text: tool.name,
    disabled: tool.disabled?.(),
    hotkeyText: hotkeys.formatHotkeys(
      (tool.hotkey as HotkeysNS.Hotkey[]) ?? [],
    ),
    icon: tool.icon,
    id: tool.id,
  })),
);

const onSecondaryToolClick = (_: MouseEvent, { id }: { id: string }) => {
  const foundTool = secondaryTools.value.find((tool) => tool.id === id);
  foundTool?.onClick?.();
};

// +1 to include the border color tool
const totalEditorTools = computed(() => primaryTools.value.length + 1);

type HeadingMenuItem = MenuItem & { onClick: () => void };

const headingPresets = computed<HeadingMenuItem[]>(() => {
  // eslint-disable-next-line no-magic-numbers
  const levels: Level[] = [1, 2, 3, 4, 5, 6];

  const getCurrentLevel = () =>
    levels.find((level) => props.editor.isActive("heading", { level }));

  const base = [
    {
      text: "Normal text",
      selected: !props.editor.isActive("heading"),
      hotkeyText: hotkeys.formatHotkeys(["Ctrl", "Alt", "0"]),
      onClick: () => {
        const currentLevel = getCurrentLevel();
        if (currentLevel) {
          props.editor
            .chain()
            .focus()
            .toggleHeading({ level: currentLevel })
            .run();
        }
      },
    },
  ] satisfies HeadingMenuItem[];

  const headings = levels.map((level) => ({
    text: `Heading ${level}`,
    selected: props.editor.isActive("heading", { level }),
    hotkeyText: hotkeys.formatHotkeys(["Ctrl", "Alt", String(level)]),
    onClick: () => props.editor.chain().focus().setHeading({ level }).run(),
  }));

  return base.concat(headings);
});

const selectedHeadingText = computed(
  () => headingPresets.value.find((heading) => heading.selected)?.text,
);

const { zoomFactor } = storeToRefs(useSVGCanvasStore());

const toolbarItemPadding = 8;
const toolbarItemGap = 4;
const toolbarItemSize = 32;
const headingDropdownWidth = 115;

const toolbarWidth =
  /* account for padding on both ends */
  toolbarItemPadding * 2 +
  /* account for all items */
  totalEditorTools.value * toolbarItemSize +
  /* add space for heading dropdown */
  (headingDropdownWidth + toolbarItemGap) +
  /* include gaps (total gaps = total items - 1) */
  toolbarItemGap * (totalEditorTools.value - 1);

const adjustedPosition = computed(() => {
  // center X -> shift toolbar forward based on annotation width and then subtract
  // half the width (accounting for the zoom factor)
  const xOffset =
    props.annotationBounds.width / 2 -
    Math.ceil(toolbarWidth / 2 / zoomFactor.value);
  const x = props.annotationBounds.x + xOffset;

  // use same Y as annotation and add a negative Y offset equal to the toolbar height
  const y =
    props.annotationBounds.y -
    $shapes.annotationToolbarContainerHeight / zoomFactor.value;

  return {
    x,
    y,
  };
});

const isBorderColorSelectionOpen = ref(false);
const hoveredColor = ref<string | null>(null);

const previewBorderColor = (color: string | null) => {
  hoveredColor.value = color;
  emit("previewBorderColor", color);
};

const changeBorderColor = (color: string) => {
  isBorderColorSelectionOpen.value = false;
  hoveredColor.value = null;
  emit("changeBorderColor", color);
};
</script>

<template>
  <FloatingMenu
    :canvas-position="adjustedPosition"
    aria-label="Annotation toolbar"
    :prevent-overflow="true"
    :close-on-escape="false"
    v-bind="$attrs"
  >
    <div class="editor-toolbar" data-ignore-click-outside>
      <SubMenu
        :items="headingPresets"
        orientation="right"
        :teleport-to-body="false"
        positioning-strategy="absolute"
        class="heading-menu"
        @item-click="(_: MouseEvent, item: HeadingMenuItem) => item.onClick()"
      >
        <span class="heading-current-text">{{ selectedHeadingText }}</span>
        <DropdownIcon />
      </SubMenu>

      <FunctionButton
        v-for="tool of primaryTools"
        :key="tool.id"
        :active="tool.active ? tool.active() : false"
        :title="`${tool.name} – ${hotkeys.formatHotkeys(tool.hotkey ?? [])}`"
        :disabled="tool.disabled?.()"
        class="toolbar-button"
        @click.stop="tool.onClick"
      >
        <Component :is="tool.icon" />
      </FunctionButton>

      <SubMenu
        v-if="secondaryTools.length > 0"
        :items="secondaryToolsMenuItems"
        orientation="left"
        @item-click="onSecondaryToolClick"
      >
        <MoreActionsIcon />
      </SubMenu>

      <RichTextAnnotationToolbarDialog :is-open="isBorderColorSelectionOpen">
        <template #toggle>
          <FunctionButton
            class="border-color-tool"
            @click.stop="
              isBorderColorSelectionOpen = !isBorderColorSelectionOpen
            "
          >
            <ColorIcon :color="hoveredColor || activeBorderColor" />
          </FunctionButton>
        </template>

        <template #content>
          <ColorSelectionDialog
            :active-color="activeBorderColor"
            @hover-color="previewBorderColor"
            @select-color="changeBorderColor"
          />
        </template>
      </RichTextAnnotationToolbarDialog>
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.editor-toolbar {
  --z-index-common-menu-items-expanded: v-bind("$zIndices.layerExpandedMenus");

  display: flex;
  justify-content: center;
  background: var(--knime-white);
  gap: calc(v-bind(toolbarItemGap) * 1px);
  padding: calc(v-bind(toolbarItemPadding) * 1px);
  width: calc(v-bind(toolbarWidth) * 1px);
  height: 48px;
  box-shadow: var(--shadow-elevation-1);
  border-radius: 30px;

  & .toolbar-button,
  & .border-color-tool {
    width: calc(v-bind(toolbarItemSize) * 1px);
    height: calc(v-bind(toolbarItemSize) * 1px);
    padding: 0;
    justify-content: center;
    align-items: center;
  }

  & .toolbar-button {
    & svg {
      width: calc(calc(v-bind(toolbarItemSize) - 14) * 1px);
      height: calc(calc(v-bind(toolbarItemSize) - 14) * 1px);
    }
  }

  & .heading-menu {
    width: calc(v-bind(headingDropdownWidth) * 1px);

    & .heading-current-text {
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    & :deep(.submenu-toggle) {
      width: 100%;
      padding: 0 10px;
      height: calc(v-bind(toolbarItemSize) * 1px);
      justify-content: center;
      align-items: center;
    }

    & :deep(.submenu-toggle) svg {
      @mixin svg-icon-size 12;
    }

    & :deep(.submenu-toggle.expanded) svg {
      transform: scaleY(-1);
    }
  }

  & .border-color-tool:hover {
    & svg {
      fill: white;
    }
  }
}
</style>
