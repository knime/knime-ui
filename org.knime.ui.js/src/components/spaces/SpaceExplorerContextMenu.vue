<script lang="ts" setup>
import MenuItems, {
  type MenuItem,
} from "webapps-common/ui/components/MenuItems.vue";

import type {
  FileExplorerContextMenu,
  FileExplorerItem,
} from "@/components/spaces/FileExplorer/types";
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
import type { SpaceProvider } from "@/api/custom-types";

const store = useStore<RootStoreState>();

interface Props {
  createRenameOption: FileExplorerContextMenu.CreateDefaultMenuOption;
  createDeleteOption: FileExplorerContextMenu.CreateDefaultMenuOption;
  anchorItem: FileExplorerItem;
  isMultipleSelectionActive: boolean;
  onItemClick: (item: MenuItem) => void;
  closeContextMenu: () => void;
  projectId: string;
  selectedItems: Array<string>;
}

const props = defineProps<Props>();

const disconnectedSpaceProviders = computed(() => {
  return Object.values(store.state.spaces.spaceProviders).filter(
    (provider) => !provider.connected
  ) as SpaceProvider[];
});

const downloadToLocalSpace = buildHubDownloadMenuItem(
  store.dispatch,
  props.projectId,
  props.selectedItems
);

const uploadAndConnectToHub = buildHubUploadMenuItems(
  store.dispatch,
  store.getters["spaces/hasActiveHubSession"],
  props.projectId,
  props.selectedItems,
  disconnectedSpaceProviders.value
);

const handleItemClick = (item) => {
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
    anchorItem: { item: anchorItem },
    isMultipleSelectionActive,
  } = props;

  const isLocal = store.getters["spaces/getSpaceInfo"](props.projectId).local;

  const openFileType =
    anchorItem.type === SpaceItem.TypeEnum.Workflow ? "workflows" : "folders";

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
