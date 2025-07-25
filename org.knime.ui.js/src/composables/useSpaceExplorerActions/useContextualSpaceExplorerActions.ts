import { type Ref, computed } from "vue";
import { storeToRefs } from "pinia";

import {
  type CreateDefaultMenuOption,
  type FileExplorerItem,
  type MenuItem,
} from "@knime/components";

import { isBrowser, isDesktop } from "@/environment";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import {
  isHubProvider,
  isLocalProvider,
  isServerProvider,
} from "@/store/spaces/util";
import { valueOrEmpty } from "@/util/valueOrEmpty";

import { useSpaceExplorerActions } from "./useSpaceExplorerActions";

export type ActionMenuItem = MenuItem & {
  id?: string;
  execute?: (() => void) | null;
};

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
    downloadInBrowser,
    moveToSpace,
    copyToSpace,
    uploadToHub,
    openInBrowserAction,
    openAPIDefinitionAction,
    openPermissionsDialogAction,
    displayDeploymentsAction,
    executeWorkflowAction,
    uploadAction,
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

  const spaceExplorerActionsItems = computed(() => {
    return [
      ...valueOrEmpty(isDesktop(), createWorkflow.value),
      createFolderAction.value,
      ...valueOrEmpty(isBrowser(), uploadAction.value),
      ...valueOrEmpty(isDesktop(), importWorkflow.value),
      ...valueOrEmpty(isDesktop(), importFiles.value),
      ...valueOrEmpty(isLocal.value, uploadToHub.value),
      ...valueOrEmpty(isHub.value && isDesktop(), downloadToLocalSpace.value),
      ...valueOrEmpty(isHub.value && isBrowser(), downloadInBrowser.value),
      ...valueOrEmpty(isHub.value || isServer.value, moveToSpace.value),
      ...valueOrEmpty(isHub.value || isServer.value, copyToSpace.value),
      ...valueOrEmpty(
        isServer.value && isWorkflowSelected.value,
        openAPIDefinitionAction.value,
      ),
      reloadAction.value,
    ];
  });

  const spaceExplorerContextMenuItems = computed(() => {
    return [
      ...valueOrEmpty(!options.isMultipleSelectionActive, renameItem.value),
      deleteItem.value,
      duplicateItem.value,
      ...valueOrEmpty(isLocal.value, exportItem.value),
      moveToSpace.value,
      copyToSpace.value,
      ...valueOrEmpty(isLocal.value, uploadToHub.value),
      ...valueOrEmpty(
        (isHub.value || (isServer.value && doesSelectionContainWorkflow)) &&
          isDesktop(),
        downloadToLocalSpace.value,
      ),
      ...valueOrEmpty(
        !options.isMultipleSelectionActive && isHub.value && isBrowser(),
        downloadInBrowser.value,
      ),
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
    ];
  });

  return {
    createWorkflow,
    spaceExplorerActionsItems,
    spaceExplorerContextMenuItems,
  };
};
