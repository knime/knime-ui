<script lang="ts" setup>
import { toRefs } from "vue";

import {
  type FileExplorerContextMenu,
  type MenuItem,
  MenuItems,
} from "@knime/components";

import {
  type ActionMenuItem,
  useContextualSpaceExplorerActions,
} from "@/composables/useSpaceExplorerActions/useContextualSpaceExplorerActions";

interface Props {
  createRenameOption: FileExplorerContextMenu.CreateDefaultMenuOption;
  createDeleteOption: FileExplorerContextMenu.CreateDefaultMenuOption;
  anchor: FileExplorerContextMenu.Anchor;
  isMultipleSelectionActive: boolean;
  onItemClick: (item: MenuItem) => void;
  closeContextMenu: () => void;
  projectId: string;
  selectedItemIds: Array<string>;
}

const props = defineProps<Props>();

const {
  createRenameOption,
  createDeleteOption,
  anchor: { item: anchorItem },
  isMultipleSelectionActive,
} = props;
const { selectedItemIds, projectId } = toRefs(props);
const { spaceExplorerContextMenuItems } = useContextualSpaceExplorerActions(
  projectId,
  selectedItemIds,
  {
    createRenameOption,
    createDeleteOption,
    anchorItem,
    isMultipleSelectionActive,
  },
);

const handleItemClick = (item: ActionMenuItem) => {
  if (item.execute) {
    item.execute();
    props.closeContextMenu();
    return;
  }
  // use file explorers default impl
  props.onItemClick(item);
};
</script>

<template>
  <MenuItems
    id="space-explorer-context-menu"
    menu-aria-label="Space explorer context menu"
    class="menu-items"
    register-keydown
    :items="spaceExplorerContextMenuItems"
    @close="closeContextMenu"
    @item-click="(_: MouseEvent, item: ActionMenuItem) => handleItemClick(item)"
  />
</template>
