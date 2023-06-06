<script setup lang="ts">
import {
  computed,
  ref,
  type FunctionalComponent,
  type SVGAttributes,
  onMounted,
  onUnmounted,
} from "vue";
import { useStore } from "vuex";
import type { Editor } from "@tiptap/vue-3";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import type { Level } from "@tiptap/extension-heading";
import DropdownIcon from "webapps-common/ui/assets/img/icons/arrow-dropdown.svg";
import BoldIcon from "@/assets/bold.svg";
import ItalicIcon from "@/assets/italic.svg";
import UnderlineIcon from "@/assets/underline.svg";
import BulletListIcon from "@/assets/unordered-list.svg";
import OrderedListIcon from "@/assets/ordered-list.svg";
import AlignLeftIcon from "@/assets/align-left.svg";
import AlignCenterIcon from "@/assets/align-center.svg";
import AlignRightIcon from "@/assets/align-right.svg";
import LinkIcon from "webapps-common/ui/assets/img/icons/link.svg";

import type { Bounds } from "@/api/gateway-api/generated-api";
import FloatingMenu from "@/components/common/FloatingMenu.vue";
import * as $shapes from "@/style/shapes.mjs";
import { formatHotkeys } from "@/util/formatHotkeys";
import type { Hotkeys } from "@/shortcuts";

import ColorIcon from "./ColorIcon.vue";
import RichTextEditorToolbarDialog from "./RichTextEditorToolbarDialog.vue";
import ColorSelectionDialog from "./ColorSelectionDialog.vue";
import CreateLinkModal from "./CreateLinkModal.vue";

import { addCustomLink } from "./extended-link";
import { getMetaOrCtrlKey } from "@/util/navigator";

interface Props {
  editor: Editor;
  annotationBounds: Bounds;
  activeBorderColor: string;
}

interface ToolbarItem {
  id: string;
  name: string;
  icon: FunctionalComponent<SVGAttributes>;
  hotkey: Hotkeys;
  onClick: () => void;
  active?: () => boolean;
}

const store = useStore();

const props = defineProps<Props>();

// eslint-disable-next-line func-call-spacing
const emit = defineEmits<{
  (e: "previewBorderColor", color: string): void;
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
    const textBefore = state.selection.$from.nodeBefore?.textContent ?? "";
    const textAfter = state.selection.$to.nodeAfter?.textContent ?? "";
    const hasNoSelection = from === to;

    text.value = hasNoSelection
      ? textBefore + textAfter
      : state.doc.textBetween(from, to, "");
  } else {
    text.value = state.doc.textBetween(from, to, "");
  }

  isEditingLink.value = currentLink || text.value;
  showCreateLinkModal.value = true;
};

const addLink = (text: string, urlText: string) => {
  props.editor.chain().focus().extendMarkRange("link").unsetLink().run();

  if (urlText) {
    const containsHttp = ["http://", "https://"].some((protocol) =>
      urlText.includes(protocol)
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

const editorTools: Array<ToolbarItem> = [
  {
    id: "bold",
    name: "Bold",
    hotkey: ["Ctrl", "B"],
    icon: BoldIcon,
    active: () => props.editor.isActive("bold"),
    onClick: () => props.editor.chain().focus().toggleBold().run(),
  },
  {
    id: "italic",
    name: "Italic",
    icon: ItalicIcon,
    hotkey: ["Ctrl", "I"],
    active: () => props.editor.isActive("italic"),
    onClick: () => props.editor.chain().focus().toggleItalic().run(),
  },
  {
    id: "underline",
    name: "Underline",
    icon: UnderlineIcon,
    hotkey: ["Ctrl", "U"],
    active: () => props.editor.isActive("underline"),
    onClick: () => props.editor.chain().focus().toggleUnderline().run(),
  },
  {
    id: "bullet-list",
    name: "Bullet list",
    icon: BulletListIcon,
    hotkey: ["Ctrl", "Shift", "8"],
    active: () => props.editor.isActive("bulletList"),
    onClick: () => props.editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "bullet-list-numbered",
    name: "Ordered list",
    icon: OrderedListIcon,
    hotkey: ["Ctrl", "Shift", "7"],
    active: () => props.editor.isActive("orderedList"),
    onClick: () => props.editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "align-left",
    icon: AlignLeftIcon,
    name: "Align left",
    hotkey: ["Ctrl", "Shift", "L"],
    active: () => props.editor.isActive({ textAlign: "left" }),
    onClick: () => props.editor.chain().focus().setTextAlign("left").run(),
  },
  {
    id: "align-center",
    icon: AlignCenterIcon,
    name: "Align center",
    hotkey: ["Ctrl", "Shift", "E"],
    active: () => props.editor.isActive({ textAlign: "center" }),
    onClick: () => props.editor.chain().focus().setTextAlign("center").run(),
  },
  {
    id: "align-right",
    icon: AlignRightIcon,
    name: "Align right",
    hotkey: ["Ctrl", "Shift", "R"],
    active: () => props.editor.isActive({ textAlign: "right" }),
    onClick: () => props.editor.chain().focus().setTextAlign("right").run(),
  },
  {
    id: "add-link",
    icon: LinkIcon,
    name: "Add link",
    hotkey: ["Ctrl", "K"],
    active: () => props.editor.isActive("link"),
    onClick: () => createLink(),
  },
];

// +1 to include the border color tool
const totalEditorTools = computed(() => editorTools.length + 1);

const headingPresets = computed(() => {
  // eslint-disable-next-line no-magic-numbers
  const levels: Level[] = [1, 2, 3, 4, 5, 6];

  const getCurrentLevel = () =>
    levels.find((level) => props.editor.isActive("heading", { level }));

  const base = [
    {
      text: "Normal text",
      selected: !props.editor.isActive("heading"),
      hotkeyText: formatHotkeys(["Ctrl", "Alt", "0"]),
      onClick: () =>
        props.editor
          .chain()
          .focus()
          .toggleHeading({ level: getCurrentLevel() })
          .run(),
    },
  ];

  const headings = levels.map((level) => ({
    text: `Heading ${level}`,
    selected: props.editor.isActive("heading", { level }),
    hotkeyText: formatHotkeys(["Ctrl", "Alt", String(level)]),
    onClick: () => props.editor.chain().focus().setHeading({ level }).run(),
  }));

  return base.concat(headings);
});

const selectedHeadingText = computed(
  () => headingPresets.value.find((heading) => heading.selected)?.text
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
  headingDropdownWidth +
  toolbarItemGap +
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
const onKeyDown = (e: KeyboardEvent) => {
  const ctrlPressed = e[getMetaOrCtrlKey()];
  if (ctrlPressed && e.key === "k") {
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
    v-bind="$attrs"
  >
    <div class="editor-toolbar">
      <SubMenu
        :items="headingPresets"
        orientation="right"
        :teleport-to-body="false"
        positioning-strategy="absolute"
        class="heading-menu"
        @item-click="(e, item) => item.onClick()"
      >
        <span class="heading-current-text">{{ selectedHeadingText }}</span>
        <DropdownIcon />
      </SubMenu>
      <FunctionButton
        v-for="tool of editorTools"
        :key="tool.icon"
        :active="tool.active ? tool.active() : false"
        :title="`${tool.name} – ${formatHotkeys(tool.hotkey)}`"
        class="toolbar-button"
        @click.stop="tool.onClick"
      >
        <Component :is="tool.icon" />
      </FunctionButton>

      <RichTextEditorToolbarDialog :is-open="isBorderColorSelectionOpen">
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
      </RichTextEditorToolbarDialog>
    </div>
  </FloatingMenu>
  <CreateLinkModal
    :is-active="showCreateLinkModal"
    :text="text"
    :url="url"
    @add-link="addLink"
    @cancel-add-link="cancelAddLink"
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
