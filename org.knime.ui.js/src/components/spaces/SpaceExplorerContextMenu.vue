<script lang="ts" setup>
import { computed } from "vue";
import { type Dispatch, useStore } from "vuex";

import MenuItems, {
  type MenuItem,
} from "webapps-common/ui/components/MenuItems.vue";
import DeleteIcon from "webapps-common/ui/assets/img/icons/trash.svg";
import RenameIcon from "webapps-common/ui/assets/img/icons/pencil.svg";
import ExportIcon from "webapps-common/ui/assets/img/icons/export.svg";

import { SpaceItem } from "@/api/gateway-api/generated-api";
import type { RootStoreState } from "@/store/types";
import {
  buildHubDownloadMenuItem,
  buildHubUploadMenuItems,
  buildOpenInHubMenuItem,
} from "@/components/spaces/hubMenuItems";
import type { FileExplorerContextMenu } from "@/components/spaces/FileExplorer/types";

const store = useStore<RootStoreState>();

const getProviderInfo = computed(() => store.getters["spaces/getProviderInfo"]);

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

const handleItemClick = (item: MenuItem & { execute?: () => void }) => {
  if (item.execute) {
    item.execute();
    props.closeContextMenu();
    return;
  }
  // use file explorers default impl
  props.onItemClick(item);
};

const valueOrEmpty = <T,>(condition: boolean, value: T) =>
  condition ? [value] : [];

const fileExplorerContextMenuItems = computed(() => {
  const {
    createRenameOption,
    createDeleteOption,
    anchor: { item: anchorItem },
    isMultipleSelectionActive,
  } = props;

  const isLocal = store.getters["spaces/getSpaceInfo"](props.projectId).local;

  const selectionContainsFile = store.getters["spaces/selectionContainsFile"](
    props.projectId,
    props.selectedItemIds,
  );

  const downloadToLocalSpace = buildHubDownloadMenuItem(
    store.dispatch,
    props.projectId,
    props.selectedItemIds,
  );

  const openInHub = buildOpenInHubMenuItem(
    store.dispatch,
    props.projectId,
    props.selectedItemIds,
    getProviderInfo.value(props.projectId),
  );

  const uploadAndConnectToHub = buildHubUploadMenuItems(
    store.dispatch,
    store.getters["spaces/hasActiveHubSession"],
    props.projectId,
    props.selectedItemIds,
    store.state.spaces.spaceProviders,
  );

  const getHubActions = () => {
    if (isLocal) {
      return uploadAndConnectToHub;
    }

    if (selectionContainsFile) {
      return [downloadToLocalSpace];
    }

    return [downloadToLocalSpace, openInHub];
  };

  const createExportItemOption = (
    dispatch: Dispatch,
    projectId: string,
    selectedItems: Array<string>,
  ) => {
    const isSelectionMultiple = selectedItems.length > 1;
    return {
      id: "export",
      text: "Export",
      icon: ExportIcon,
      disabled: selectionContainsFile || isSelectionMultiple,
      execute: () => {
        dispatch("spaces/exportSpaceItem", {
          projectId,
          itemId: selectedItems[0],
        });
      },
    };
  };

  const openFileType =
    anchorItem.meta.type === SpaceItem.TypeEnum.Workflow
      ? "workflows"
      : "folders";

  const renameOptionTitle = anchorItem.isOpen
    ? `Open ${openFileType} cannot be renamed`
    : "";

  const contextMenuItems = [
    // hide rename for multiple selected items
    ...valueOrEmpty(
      !isMultipleSelectionActive,
      createRenameOption(anchorItem, {
        title: renameOptionTitle,
        icon: RenameIcon,
      }),
    ),

    createDeleteOption(anchorItem, {
      title: anchorItem.canBeDeleted ? "" : "Open folders cannot be deleted",
      icon: DeleteIcon,
    }),

    ...valueOrEmpty(
      isLocal,
      createExportItemOption(
        store.dispatch,
        props.projectId,
        props.selectedItemIds,
      ),
    ),

    ...getHubActions(),
  ];

  return contextMenuItems;
});
</script>

<template>
  <MenuItems
    id="space-explorer-context-menu"
    menu-aria-label="Space explorer context menu"
    class="menu-items"
    :items="fileExplorerContextMenuItems"
    @item-click="(_, item) => handleItemClick(item)"
  />
</template>
