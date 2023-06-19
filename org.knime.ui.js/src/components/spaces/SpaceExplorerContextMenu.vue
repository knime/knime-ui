<script lang="ts" setup>
import MenuItems, {
  type MenuItem,
} from "webapps-common/ui/components/MenuItems.vue";

import type { FileExplorerContextMenu } from "@/components/spaces/FileExplorer/types";
import { SpaceItem } from "@/api/gateway-api/generated-api";
import { computed } from "vue";
import { useStore } from "vuex";
import type { RootStoreState } from "@/store/types";
import DeleteIcon from "webapps-common/ui/assets/img/icons/trash.svg";
import RenameIcon from "webapps-common/ui/assets/img/icons/pencil.svg";
import {
  buildHubDownloadMenuItem,
  buildHubUploadMenuItems,
} from "@/components/spaces/hubMenuItems";

const store = useStore<RootStoreState>();

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

const handleItemClick = (item: MenuItem & { execute: () => void }) => {
  if (item.execute) {
    item.execute();
    props.closeContextMenu();
    return;
  }
  // use file explorers default impl
  props.onItemClick(item);
};

const fileExplorerContextMenuItems = computed(() => {
  const {
    createRenameOption,
    createDeleteOption,
    anchor: { item: anchorItem },
    isMultipleSelectionActive,
  } = props;

  const isLocal = store.getters["spaces/getSpaceInfo"](props.projectId).local;

  const downloadToLocalSpace = buildHubDownloadMenuItem(
    store.dispatch,
    props.projectId,
    props.selectedItemIds
  );

  const uploadAndConnectToHub = buildHubUploadMenuItems(
    store.dispatch,
    store.getters["spaces/hasActiveHubSession"],
    props.projectId,
    props.selectedItemIds,
    store.state.spaces.spaceProviders
  );

  const openFileType =
    anchorItem.meta.type === SpaceItem.TypeEnum.Workflow
      ? "workflows"
      : "folders";

  const renameOptionTitle = anchorItem.isOpen
    ? `Open ${openFileType} cannot be renamed`
    : "";

  return [
    {
      ...createRenameOption(anchorItem, {
        title: renameOptionTitle,
        icon: RenameIcon,
      }),
      hidden: isMultipleSelectionActive,
    },

    createDeleteOption(anchorItem, {
      title: anchorItem.canBeDeleted ? "" : "Open folders cannot be deleted",
      icon: DeleteIcon,
    }),

    ...(isLocal ? uploadAndConnectToHub : [downloadToLocalSpace]),
  ].filter(({ hidden }) => !hidden);
});
</script>

<template>
  <MenuItems
    menu-aria-label="Space explorer context menu"
    class="menu-items"
    :items="fileExplorerContextMenuItems"
    @item-click="(_, item) => handleItemClick(item)"
  />
</template>
