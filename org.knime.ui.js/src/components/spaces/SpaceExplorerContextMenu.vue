<script lang="ts" setup>
import { computed } from "vue";
import type { Dispatch } from "vuex";

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
import { useStore } from "@/composables/useStore";
import {
  isHubProvider,
  isLocalProvider,
  isServerProvider,
} from "@/store/spaces/util";

const store = useStore();

const getProviderInfoFromProjectPath = computed(
  () => store.getters["spaces/getProviderInfoFromProjectPath"],
);

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

interface Emits {
  (e: "duplicateItems", sourceItems: string[]): void;
}

const emit = defineEmits<Emits>();

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

const valueOrEmpty = <T,>(condition: boolean, value: T) =>
  condition ? [value] : [];

const fileExplorerContextMenuItems = computed<SpaceExplorerContentMenuItem[]>(
  () => {
    const {
      createRenameOption,
      createDeleteOption,
      anchor: { item: anchorItem },
      isMultipleSelectionActive,
    } = props;

    const isLocal = isLocalProvider(
      getProviderInfoFromProjectPath.value(props.projectId),
    );

    const isServer = isServerProvider(
      getProviderInfoFromProjectPath.value(props.projectId),
    );

    const isHub = isHubProvider(
      getProviderInfoFromProjectPath.value(props.projectId),
    );

    const selectionContainsFile = store.getters["spaces/selectionContainsFile"](
      props.projectId,
      props.selectedItemIds,
    );

    const selectionContainsWorkflow = store.getters[
      "spaces/selectionContainsWorkflow"
    ](props.projectId, props.selectedItemIds);

    const downloadToLocalSpace = buildHubDownloadMenuItem(
      store.dispatch,
      props.projectId,
      props.selectedItemIds,
    );

    const moveToSpace = buildMoveToSpaceMenuItem(
      store.dispatch,
      props.projectId,
      props.selectedItemIds,
    );

    const copyToSpace = buildCopyToSpaceMenuItem(
      store.dispatch,
      props.projectId,
      props.selectedItemIds,
    );

    const openInBrowser = buildOpenInBrowserMenuItem(
      store.dispatch,
      props.projectId,
      props.selectedItemIds,
      getProviderInfoFromProjectPath.value(props.projectId),
    );

    const openAPIDefinition = buildOpenAPIDefinitionMenuItem(
      store.dispatch,
      props.projectId,
      props.selectedItemIds,
    );

    const uploadToHub = buildHubUploadMenuItem(
      store.dispatch,
      props.projectId,
      props.selectedItemIds,
    );

    const displayDeployments = buildDisplayDeploymentsMenuItem(
      store.dispatch,
      props.projectId,
      props.selectedItemIds,
      anchorItem.name,
    );

    const openPermissionsDialog = buildOpenPermissionsDialog(
      store.dispatch,
      props.projectId,
      props.selectedItemIds,
    );

    const executeWorkflow = buildExecuteWorkflowMenuItem(
      store.dispatch,
      props.projectId,
      props.selectedItemIds,
    );

    const createExportItemOption = (
      dispatch: Dispatch,
      projectId: string,
      selectedItems: Array<string>,
    ) => {
      const isSelectionMultiple = selectedItems.length > 1;
      return {
        id: "export",
        text: "Export",
        icon: FileExportIcon,
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
      store.dispatch,
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
        isHub || (isServer && selectionContainsWorkflow),
        downloadToLocalSpace,
      ),

      ...valueOrEmpty(
        (isHub && !selectionContainsFile) || isServer,
        openInBrowser,
      ),

      ...valueOrEmpty(isServer && selectionContainsWorkflow, executeWorkflow),

      ...valueOrEmpty(
        isServer && selectionContainsWorkflow,
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
