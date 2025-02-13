<script lang="ts" setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";

import {
  type FileExplorerContextMenu,
  type MenuItem,
  MenuItems,
} from "@knime/components";
import DuplicateIcon from "@knime/styles/img/icons/duplicate.svg";
import FileExportIcon from "@knime/styles/img/icons/file-export.svg";
import RenameIcon from "@knime/styles/img/icons/pencil.svg";
import DeleteIcon from "@knime/styles/img/icons/trash.svg";
import { hotkeys } from "@knime/utils";

import { SpaceItem } from "@/api/gateway-api/generated-api";
import {
  buildCopyToSpaceMenuItem,
  buildDisplayDeploymentsMenuItem,
  buildExecuteWorkflowMenuItem,
  buildHubDownloadMenuItem,
  buildHubUploadMenuItem,
  buildMoveToSpaceMenuItem,
  buildOpenAPIDefinitionMenuItem,
  buildOpenInBrowserMenuItem,
  buildOpenPermissionsDialog,
} from "@/components/spaces/remoteMenuItems";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import {
  isHubProvider,
  isLocalProvider,
  isServerProvider,
} from "@/store/spaces/util";
import { valueOrEmpty } from "@/util/valueOrEmpty";

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

const { getProviderInfoFromProjectPath } = storeToRefs(
  useSpaceProvidersStore(),
);
const { selectionContainsFile, selectionContainsWorkflow } = storeToRefs(
  useSpaceOperationsStore(),
);
const { exportSpaceItem } = useSpaceOperationsStore();

const emit = defineEmits<{
  duplicateItems: [sourceItems: string[]];
}>();

type SpaceExplorerContentMenuItem = MenuItem & { execute?: () => void };

const handleItemClick = (item: SpaceExplorerContentMenuItem) => {
  if (item.execute) {
    item.execute();
    props.closeContextMenu();
    return;
  }
  // use file explorers default impl
  props.onItemClick(item);
};

const fileExplorerContextMenuItems = computed<SpaceExplorerContentMenuItem[]>(
  () => {
    const {
      createRenameOption,
      createDeleteOption,
      anchor: { item: anchorItem },
      isMultipleSelectionActive,
    } = props;

    const providerInfo = getProviderInfoFromProjectPath.value(props.projectId);

    if (!providerInfo) {
      return [];
    }

    const isLocal = isLocalProvider(providerInfo);

    const isHub = isHubProvider(providerInfo);

    const isServer = isServerProvider(providerInfo);

    const doesSelectionContainFile = selectionContainsFile.value(
      props.projectId,
      props.selectedItemIds,
    );

    const doesSelectionContainWorkflow = selectionContainsWorkflow.value(
      props.projectId,
      props.selectedItemIds,
    );

    const downloadToLocalSpace = buildHubDownloadMenuItem(
      props.projectId,
      props.selectedItemIds,
    );

    const moveToSpace = buildMoveToSpaceMenuItem(
      props.projectId,
      props.selectedItemIds,
    );

    const copyToSpace = buildCopyToSpaceMenuItem(
      props.projectId,
      props.selectedItemIds,
    );

    const openInBrowser = buildOpenInBrowserMenuItem(
      props.projectId,
      props.selectedItemIds,
      providerInfo,
    );

    const openAPIDefinition = buildOpenAPIDefinitionMenuItem(
      props.projectId,
      props.selectedItemIds,
    );

    const uploadToHub = buildHubUploadMenuItem(
      props.projectId,
      props.selectedItemIds,
    );

    const displayDeployments = buildDisplayDeploymentsMenuItem(
      props.projectId,
      props.selectedItemIds,
      anchorItem.name,
    );

    const openPermissionsDialog = buildOpenPermissionsDialog(
      props.projectId,
      props.selectedItemIds,
    );

    const executeWorkflow = buildExecuteWorkflowMenuItem(
      props.projectId,
      props.selectedItemIds,
    );

    const createExportItemOption = (
      projectId: string,
      selectedItems: Array<string>,
    ) => {
      const isSelectionMultiple = selectedItems.length > 1;
      return {
        id: "export",
        text: "Export",
        icon: FileExportIcon,
        disabled: doesSelectionContainFile || isSelectionMultiple,
        execute: () => {
          exportSpaceItem({
            projectId,
            itemId: selectedItems[0],
          });
        },
      };
    };

    const openFileType =
      anchorItem.meta?.type === SpaceItem.TypeEnum.Workflow
        ? "workflows"
        : "folders";

    const createDuplicateItemOption = () => {
      return {
        id: "duplicate",
        text: "Duplicate",
        icon: DuplicateIcon,
        title: anchorItem.isOpen
          ? `Open ${openFileType} cannot be duplicated.`
          : "",
        disabled: anchorItem.isOpen,
        execute: () => emit("duplicateItems", props.selectedItemIds),
      };
    };

    const renameOptionTitle = anchorItem.isOpen
      ? `Open ${openFileType} cannot be renamed`
      : "";
    const renameItem = createRenameOption(anchorItem, {
      title: renameOptionTitle,
      icon: RenameIcon,
      hotkeyText: hotkeys.formatHotkeys(["F2"]),
    });

    const deleteItem = createDeleteOption(anchorItem, {
      title: anchorItem.canBeDeleted ? "" : "Open folders cannot be deleted",
      icon: DeleteIcon,
      hotkeyText: hotkeys.formatHotkeys(["Delete"]),
    });

    const exportItem = createExportItemOption(
      props.projectId,
      props.selectedItemIds,
    );

    return [
      ...valueOrEmpty(!isMultipleSelectionActive, renameItem),

      deleteItem,

      createDuplicateItemOption(),

      ...valueOrEmpty(isLocal, exportItem),

      ...valueOrEmpty(isLocal || isHub, moveToSpace),

      ...valueOrEmpty(isLocal || isHub, copyToSpace),

      ...valueOrEmpty(isLocal, uploadToHub),

      ...valueOrEmpty(
        isHub || (isServer && doesSelectionContainWorkflow),
        downloadToLocalSpace,
      ),

      ...valueOrEmpty(
        (isHub && !doesSelectionContainFile) || isServer,
        openInBrowser,
      ),

      ...valueOrEmpty(
        isServer && doesSelectionContainWorkflow,
        executeWorkflow,
      ),

      ...valueOrEmpty(
        isServer && doesSelectionContainWorkflow,
        displayDeployments,
      ),

      ...valueOrEmpty(isServer, openAPIDefinition),

      ...valueOrEmpty(isServer, openPermissionsDialog),
    ];
  },
);
</script>

<template>
  <MenuItems
    id="space-explorer-context-menu"
    menu-aria-label="Space explorer context menu"
    class="menu-items"
    register-keydown
    :items="fileExplorerContextMenuItems"
    @close="closeContextMenu"
    @item-click="
      (_: MouseEvent, item: SpaceExplorerContentMenuItem) =>
        handleItemClick(item)
    "
  />
</template>
