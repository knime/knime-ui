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
import { menuGroupsBuilder } from "@/util/menuGroupsBuilder";
import { valueOrEmpty } from "@/util/valueOrEmpty";

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
  const { getProviderInfoFromProjectPath } = storeToRefs(
    useSpaceProvidersStore(),
  );
  const { selectionContainsFile, selectionContainsWorkflow } = storeToRefs(
    useSpaceOperationsStore(),
  );
  const providerInfo = computed(() =>
    getProviderInfoFromProjectPath.value(projectId.value),
  );

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
        ...valueOrEmpty(isDesktop(), createWorkflow.value),
        createFolderAction.value,
      ])
      .append([
        ...valueOrEmpty(
          isDesktop() && isLocal.value,
          uploadToHubFromLocalSpace.value,
        ),
        ...valueOrEmpty(isBrowser(), uploadToHubInBrowser.value),
        ...valueOrEmpty(isDesktop(), importWorkflow.value),
        ...valueOrEmpty(isDesktop(), importFiles.value),
      ])
      .append([
        ...valueOrEmpty(isDesktop() && isHub.value, downloadToLocalSpace.value),
        ...valueOrEmpty(
          isBrowser() && isHub.value,
          downloadFromHubInBrowser.value,
        ),
      ])
      .append([
        ...valueOrEmpty(isHub.value || isServer.value, moveToSpace.value),
        ...valueOrEmpty(isHub.value || isServer.value, copyToSpace.value),
      ])
      .append([
        ...valueOrEmpty(
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
        ...valueOrEmpty(!isMultipleSelectionActive, renameItem.value),
        deleteItem.value,
        duplicateItem.value,
        ...valueOrEmpty(isLocal.value, exportItem.value),
        moveToSpace.value,
        copyToSpace.value,
      ])
      .append([
        ...valueOrEmpty(isLocal.value, uploadToHubFromLocalSpace.value),
        ...valueOrEmpty(
          (isHub.value || (isServer.value && doesSelectionContainWorkflow)) &&
            isDesktop(),
          downloadToLocalSpace.value,
        ),
        ...valueOrEmpty(
          !isMultipleSelectionActive && isHub.value && isBrowser(),
          downloadFromHubInBrowser.value,
        ),
      ])
      .append([
        ...valueOrEmpty(
          ((isHub.value && !doesSelectionContainFile) || isServer.value) &&
            isDesktop(),
          openInBrowserAction.value,
        ),
        ...valueOrEmpty(
          isServer.value && doesSelectionContainWorkflow,
          executeWorkflowAction.value,
        ),
        ...valueOrEmpty(
          isServer.value && doesSelectionContainWorkflow,
          displayDeploymentsAction.value,
        ),
        ...valueOrEmpty(
          isServer.value && doesSelectionContainWorkflow,
          openAPIDefinitionAction.value,
        ),
        ...valueOrEmpty(isServer.value, openPermissionsDialogAction.value),
      ])
      .build();
  });

  return {
    createWorkflow,
    spaceExplorerActionsItems,
    spaceExplorerContextMenuItems,
  };
};
