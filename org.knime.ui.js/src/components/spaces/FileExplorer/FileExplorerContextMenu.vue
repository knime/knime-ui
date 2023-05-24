<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { directive as vClickAway } from "vue3-click-away";

import MenuItems from "webapps-common/ui/components/MenuItems.vue";
import usePopper from "webapps-common/ui/composables/usePopper";

import type { XY } from "@/api/gateway-api/generated-api";
import { useEscapeStack } from "@/mixins/escapeStack";

import type { FileExplorerItem, FileExplorerContextMenu } from "./types";

interface Props {
  position: XY;
  anchor: {
    item: FileExplorerItem;
    element: HTMLElement;
    index: number;
  };
  isMultipleSelectionActive: boolean;
}

const props = defineProps<Props>();

const element = ref(props.anchor.element);
const referenceRect = element.value.getBoundingClientRect();
const menuWrapper = ref<HTMLElement | null>(null);

const wrapperHeight = computed(() => {
  if (!menuWrapper.value) {
    return 0;
  }

  return menuWrapper.value.getBoundingClientRect().height;
});

const offsetX = props.position.x - referenceRect.left;
const offsetY = computed(() => {
  const clickPosition = props.position.y - referenceRect.top;
  const distanceToBottom = window.innerHeight - props.position.y;
  const isClipped = distanceToBottom < wrapperHeight.value;

  return isClipped
    ? clickPosition * -1
    : (clickPosition + wrapperHeight.value) * -1;
});

const popperOffsetModifier = computed(() => ({
  name: "offset",
  options: { offset: [offsetX, offsetY.value] },
}));

const { popperInstance } = usePopper(
  {
    popperTarget: menuWrapper,
    referenceEl: element,
  },
  {
    placement: "top-start",
    strategy: "fixed",
    modifiers: [popperOffsetModifier.value],
  }
);

watch(wrapperHeight, async () => {
  // by re-setting the modifiers we update the offset which will reposition the popper
  await popperInstance.value.setOptions({
    modifiers: [popperOffsetModifier.value],
  });
});

// eslint-disable-next-line func-call-spacing
const emit = defineEmits<{
  (e: "itemClick", payload: FileExplorerContextMenu.ItemClickPayload): void;
  (e: "close"): void;
}>();

const getRenameOption: FileExplorerContextMenu.GetDefaultMenuOption = (
  item,
  customProps = {}
) => ({
  id: "rename",
  text: "Rename",
  ...customProps,
  disabled:
    !item.canBeRenamed ||
    props.isMultipleSelectionActive ||
    customProps.disabled ||
    false,
});

const getDeleteOption: FileExplorerContextMenu.GetDefaultMenuOption = (
  item,
  customProps = {}
) => ({
  id: "delete",
  text: "Delete",
  ...customProps,
  disabled: !item.canBeDeleted || customProps.disabled || false,
});

const onItemClick = (contextMenuItem: FileExplorerContextMenu.MenuItem) => {
  const isRename = contextMenuItem.id === "rename";
  const isDelete = contextMenuItem.id === "delete";

  if (
    (isRename && !props.anchor.item.canBeRenamed) ||
    (isDelete && !props.anchor.item.canBeDeleted)
  ) {
    return;
  }

  emit("itemClick", {
    contextMenuItem,
    anchorItem: props.anchor.item,
    isDelete,
    isRename,
  });
};

const items: Array<FileExplorerContextMenu.MenuItem> = [
  getRenameOption(props.anchor.item),
  getDeleteOption(props.anchor.item),
];

const closeMenu = () => {
  popperInstance.value.destroy();
  emit("close");
};

useEscapeStack({ onEscape: closeMenu });
</script>

<template>
  <div ref="menuWrapper" v-click-away="() => closeMenu()" class="menu-wrapper">
    <slot
      :items="items"
      :get-rename-option="getRenameOption"
      :get-delete-option="getDeleteOption"
      :on-item-click="onItemClick"
    >
      <MenuItems
        menu-aria-label="File explorer context menu"
        :items="items"
        @item-click="(_, item) => onItemClick(item)"
      />
    </slot>
  </div>
</template>

<style lang="postcss" scoped>
.menu-wrapper {
  position: absolute;
  z-index: 5;
  left: calc(v-bind("$props.position.x") * 1px);
  top: calc(v-bind("$props.position.y") * 1px);
  background: white;
  box-shadow: 0 1px 4px 0 var(--knime-gray-dark-semi);
}
</style>
