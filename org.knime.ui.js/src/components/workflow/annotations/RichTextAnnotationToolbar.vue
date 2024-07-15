<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useStore } from "vuex";
import type { Editor } from "@tiptap/vue-3";
import type { Level } from "@tiptap/extension-heading";

import { FunctionButton, SubMenu, type MenuItem } from "@knime/components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";
import MoreActionsIcon from "@knime/styles/img/icons/menu-options.svg";
import LinkIcon from "@knime/styles/img/icons/link.svg";
import type { EditorTools } from "@knime/rich-text-editor";

import type { Bounds } from "@/api/gateway-api/generated-api";
import FloatingMenu from "@/components/common/FloatingMenu.vue";
import * as $shapes from "@/style/shapes";
import { hotkeys, type HotkeysNS, navigatorUtils } from "@knime/utils";

import ColorIcon from "./ColorIcon.vue";
import RichTextAnnotationToolbarDialog from "./RichTextAnnotationToolbarDialog.vue";
import ColorSelectionDialog from "./ColorSelectionDialog.vue";
import CreateLinkModal from "./CreateLinkModal.vue";

import { addCustomLink } from "./extended-link";

interface Props {
  editor: Editor;
  tools: EditorTools;
  annotationBounds: Bounds;
  activeBorderColor: string;
}

const store = useStore();

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "previewBorderColor", color: string | null): void;
  (e: "changeBorderColor", color: string): void;
}>();

let showCreateLinkModal = ref(false);

const text = ref("");
const url = ref("");
const isEditingLink = ref(false);

const createLink = () => {
  const { view, state } = props.editor;
  const { from, to } = view.state.selection;

  const currentLink = props.editor.getAttributes("link").href;
  url.value = currentLink || "";

  if (currentLink) {
    const hasSelection = from !== to;
    if (hasSelection) {
      // manually update the cursor position to get the entire link text
      const newCursorPosition = from + Math.floor((to - from) / 2);
      props.editor.chain().focus().setTextSelection(newCursorPosition).run();
    }

    const textBefore = view.state.selection.$from.nodeBefore?.textContent ?? "";
    const textAfter = view.state.selection.$to.nodeAfter?.textContent ?? "";

    text.value = textBefore + textAfter;
  } else {
    text.value = state.doc.textBetween(from, to, "");
  }

  isEditingLink.value = currentLink || text.value;
  showCreateLinkModal.value = true;
};

const removeLink = () => {
  props.editor.chain().focus().extendMarkRange("link").unsetLink().run();

  showCreateLinkModal.value = false;
  isEditingLink.value = false;
};

const addLink = (text: string, urlText: string) => {
  props.editor.chain().focus().extendMarkRange("link").unsetLink().run();

  if (urlText) {
    const containsHttp = ["http://", "https://"].some((protocol) =>
      urlText.includes(protocol),
    );
    const url = containsHttp ? urlText : `https://${urlText}`;

    addCustomLink(props.editor, {
      isEditing: isEditingLink.value,
      urlText,
      url,
      text,
    });
  }

  showCreateLinkModal.value = false;
  isEditingLink.value = false;
};

const cancelAddLink = () => {
  showCreateLinkModal.value = false;
  isEditingLink.value = false;
};

const linkTool = {
  id: "link",
  icon: LinkIcon,
  name: "Link",
  hotkey: ["Ctrl", "K"],
  active: () => props.editor.isActive("link"),
  onClick: () => createLink(),
};

const customTools = computed(() =>
  props.tools.filter(({ secondary }) => !secondary).concat(linkTool),
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
const totalEditorTools = computed(() => customTools.value.length + 2);

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

const zoomFactor = computed(() => store.state.canvas.zoomFactor);

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

/**
 * Handles custom hotkeys that are not supported by tiptap.
 */
const onKeyDown = (event: KeyboardEvent) => {
  const ctrlPressed = event[navigatorUtils.getMetaOrCtrlKey()];
  if (ctrlPressed && event.key === "k") {
    createLink();
  }
};

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
});
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
        v-for="tool of customTools"
        :key="tool.icon"
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
  <CreateLinkModal
    :is-active="showCreateLinkModal"
    :text="text"
    :url="url"
    :is-edit="url !== ''"
    @add-link="addLink"
    @cancel-add-link="cancelAddLink"
    @remove-link="removeLink"
  />
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
