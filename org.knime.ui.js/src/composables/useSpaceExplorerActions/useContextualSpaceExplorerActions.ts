import { type Ref, computed } from "vue";
import { storeToRefs } from "pinia";

import {
  type CreateDefaultMenuOption,
  type FileExplorerItem,
} from "@knime/components";

import type { MenuItemWithHandler } from "@/components/common/types";
import { isBrowser, isDesktop } from "@/environment";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import {
  isHubProvider,
  isLocalProvider,
  isServerProvider,
} from "@/store/spaces/util";
import { optional } from "@/util/fp";
import { menuGroupsBuilder } from "@/util/menu-groups-builder";

import { useSpaceExplorerActions } from "./useSpaceExplorerActions";

/**
 * Get the actions that can be made on the Space Explorer, based
 * on different sets of constraints (e.g environment, selection, current space, etc).
 */
export const useContextualSpaceExplorerActions = (
  projectId: Ref<string>,
  selectedItemIds: Ref<string[]>,
  options: {
    mode?: string;
    createRenameOption?: CreateDefaultMenuOption;
    createDeleteOption?: CreateDefaultMenuOption;
    anchorItem?: FileExplorerItem;
    isMultipleSelectionActive?: boolean;
  },
) => {
  const { getProviderInfoFromProjectPath } = useSpaceProvidersStore();
  const { selectionContainsFile, selectionContainsWorkflow, getDeletionInfo } =
    storeToRefs(useSpaceOperationsStore());
  const providerInfo = computed(() =>
    getProviderInfoFromProjectPath(projectId.value),
  );
  const canSoftDelete = computed(() => {
    const { canSoftDelete } = getDeletionInfo.value(projectId.value);
    return canSoftDelete;
  });

  const {
    createFolderAction,
    importWorkflow,
    importFiles,
    reloadAction,
    exportItem,
    duplicateItem,
    renameItem,
    deleteItem,
    createWorkflow,
    downloadToLocalSpace,
    downloadFromHubInBrowser,
    moveToSpace,
    copyToSpace,
    uploadToHubFromLocalSpace,
    openInBrowserAction,
    openAPIDefinitionAction,
    openPermissionsDialogAction,
    displayDeploymentsAction,
    executeWorkflowAction,
    uploadToHubInBrowser,
  } = useSpaceExplorerActions(projectId, selectedItemIds, {
    mode: options.mode,
    createRenameOption: options.createRenameOption,
    createDeleteOption: options.createDeleteOption,
    anchorItem: options.anchorItem,
    providerInfo: providerInfo.value,
    canSoftDelete: canSoftDelete.value,
  });

  const isLocal = computed(() =>
    Boolean(providerInfo.value && isLocalProvider(providerInfo.value)),
  );
  const isHub = computed(() =>
    Boolean(providerInfo.value && isHubProvider(providerInfo.value)),
  );
  const isServer = computed(() =>
    Boolean(providerInfo.value && isServerProvider(providerInfo.value)),
  );
  const isWorkflowSelected = computed(() =>
    selectionContainsWorkflow.value(projectId.value, selectedItemIds.value),
  );
  const doesSelectionContainFile = selectionContainsFile.value(
    projectId.value,
    selectedItemIds.value,
  );
  const doesSelectionContainWorkflow = selectionContainsWorkflow.value(
    projectId.value,
    selectedItemIds.value,
  );

  const spaceExplorerActionsItems = computed<MenuItemWithHandler[]>(() => {
    return menuGroupsBuilder<MenuItemWithHandler>({
      removeDisabledItems: false,
    })
      .append([
        ...optional(isDesktop(), createWorkflow.value),
        createFolderAction.value,
      ])
      .append([
        ...optional(
          isDesktop() && isLocal.value,
          uploadToHubFromLocalSpace.value,
        ),
        ...optional(isBrowser(), uploadToHubInBrowser.value),
        ...optional(isDesktop(), importWorkflow.value),
        ...optional(isDesktop(), importFiles.value),
      ])
      .append([
        ...optional(isDesktop() && isHub.value, downloadToLocalSpace.value),
        ...optional(isBrowser() && isHub.value, downloadFromHubInBrowser.value),
      ])
      .append([
        ...optional(isHub.value || isServer.value, moveToSpace.value),
        ...optional(isHub.value || isServer.value, copyToSpace.value),
      ])
      .append([
        ...optional(
          isServer.value && isWorkflowSelected.value,
          openAPIDefinitionAction.value,
        ),
        reloadAction.value,
      ])
      .build();
  });

  const spaceExplorerContextMenuItems = computed<MenuItemWithHandler[]>(() => {
    const { isMultipleSelectionActive } = options;

    return menuGroupsBuilder<MenuItemWithHandler>({
      removeDisabledItems: false,
    })
      .append([
        ...optional(!isMultipleSelectionActive, renameItem.value),
        deleteItem.value,
        duplicateItem.value,
        ...optional(isLocal.value, exportItem.value),
        moveToSpace.value,
        copyToSpace.value,
      ])
      .append([
        ...optional(isLocal.value, uploadToHubFromLocalSpace.value),
        ...optional(
          (isHub.value || (isServer.value && doesSelectionContainWorkflow)) &&
            isDesktop(),
          downloadToLocalSpace.value,
        ),
        ...optional(
          !isMultipleSelectionActive && isHub.value && isBrowser(),
          downloadFromHubInBrowser.value,
        ),
      ])
      .append([
        ...optional(
          ((isHub.value && !doesSelectionContainFile) || isServer.value) &&
            isDesktop(),
          openInBrowserAction.value,
        ),
        ...optional(
          isServer.value && doesSelectionContainWorkflow,
          executeWorkflowAction.value,
        ),
        ...optional(
          isServer.value && doesSelectionContainWorkflow,
          displayDeploymentsAction.value,
        ),
        ...optional(
          isServer.value && doesSelectionContainWorkflow,
          openAPIDefinitionAction.value,
        ),
        ...optional(isServer.value, openPermissionsDialogAction.value),
      ])
      .build();
  });

  return {
    createWorkflow,
    spaceExplorerActionsItems,
    spaceExplorerContextMenuItems,
  };
};
