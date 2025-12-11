/* eslint-disable max-lines */
/* eslint-disable no-undefined */
import { type Ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import type {
  CreateDefaultMenuOption,
  FileExplorerItem,
  MenuItem,
} from "@knime/components";
import CirclePlayIcon from "@knime/styles/img/icons/circle-play.svg";
import CloudDownloadIcon from "@knime/styles/img/icons/cloud-download.svg";
import CloudUploadIcon from "@knime/styles/img/icons/cloud-upload.svg";
import CopyIcon from "@knime/styles/img/icons/copy.svg";
import DeploymentIcon from "@knime/styles/img/icons/deployment.svg";
import DuplicateIcon from "@knime/styles/img/icons/duplicate.svg";
import RevealInSpaceIcon from "@knime/styles/img/icons/eye.svg";
import FileExportIcon from "@knime/styles/img/icons/file-export.svg";
import FolderPlusIcon from "@knime/styles/img/icons/folder-plus.svg";
import KeyIcon from "@knime/styles/img/icons/key.svg";
import LinkExternal from "@knime/styles/img/icons/link-external.svg";
import MoveToSpaceIcon from "@knime/styles/img/icons/move-from-space-to-space.svg";
import ReloadIcon from "@knime/styles/img/icons/reload.svg";
import RenameIcon from "@knime/styles/img/icons/rename.svg";
import DeleteIcon from "@knime/styles/img/icons/trash.svg";
import { hotkeys } from "@knime/utils";

import type { SpaceProviderNS } from "@/api/custom-types";
import {
  SpaceProvider as BaseSpaceProvider,
  SpaceItem,
} from "@/api/gateway-api/generated-api";
import AddFileIcon from "@/assets/add-file.svg";
import ImportWorkflowIcon from "@/assets/import-workflow.svg";
import PlusIcon from "@/assets/plus.svg";
import type { MenuItemWithHandler } from "@/components/common/types";
import { useMovingItems } from "@/components/spaces/useMovingItems";
import { useRevealInSpaceExplorer } from "@/components/spaces/useRevealInSpaceExplorer";
import { getToastsProvider } from "@/plugins/toasts";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useDeploymentsStore } from "@/store/spaces/deployments";
import { useSpaceDownloadsStore } from "@/store/spaces/downloads";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useSpacesStore } from "@/store/spaces/spaces";
import { useSpaceUploadsStore } from "@/store/spaces/uploads";
import { getToastPresets } from "@/toastPresets";

/**
 * Returns **all** the possible actions that can be made on the Space Explorer
 * at ay given time, **unconditionally**. That means, that these actions are
 * not necessarily what the user _can_ do based on some context, but instead all
 * the possible things that the Space Explorer supports.
 */
export const useSpaceExplorerActions = (
  projectId: Ref<string>,
  selectedItemIds: Ref<string[]>,
  options: {
    mode?: string;
    createRenameOption?: CreateDefaultMenuOption;
    createDeleteOption?: CreateDefaultMenuOption;
    anchorItem?: FileExplorerItem;
    providerInfo?: SpaceProviderNS.SpaceProvider | null;
    canSoftDelete: boolean;
  },
) => {
  const { toastPresets } = getToastPresets();
  const $router = useRouter();
  const { onDuplicateItems } = useMovingItems({ projectId });

  const { selectionContainsFile, isLoadingContent } = storeToRefs(
    useSpaceOperationsStore(),
  );
  const {
    exportSpaceItem,
    fetchWorkflowGroupContent,
    createFolder,
    importToWorkflowGroup,
    setCurrentSelectedItemIds,
    openPermissionsDialog,
  } = useSpaceOperationsStore();
  const {
    setCreateWorkflowModalConfig,
    moveOrCopyToSpace,
    openInBrowser,
    openAPIDefinition,
  } = useSpacesStore();
  const { moveToHubFromLocalProvider } = useSpaceUploadsStore();
  const { getWorkflowGroupContent } = useSpaceCachingStore();
  const { displayDeployments, executeWorkflow } = useDeploymentsStore();
  const { startUpload } = useSpaceUploadsStore();
  const { startDownload, moveToLocalProviderFromHub } =
    useSpaceDownloadsStore();

  const isSelectionMultiple = computed(() => selectedItemIds.value.length > 1);
  const isSelectionEmpty = computed(() => selectedItemIds.value.length === 0);
  const doesSelectionContainFile = computed(() =>
    selectionContainsFile.value(projectId.value, selectedItemIds.value),
  );
  const providerType = computed(() =>
    options.providerInfo?.type === BaseSpaceProvider.TypeEnum.HUB
      ? "Hub"
      : "WebPortal",
  );
  const openFileType =
    options.anchorItem?.meta?.type === SpaceItem.TypeEnum.Workflow
      ? "workflows"
      : "folders";

  const createFolderAction = computed(
    () =>
      ({
        text: "Create folder",
        icon: FolderPlusIcon,
        metadata: {
          id: "createFolder",
          handler: async () => {
            try {
              await createFolder({
                projectId: projectId.value,
              });
            } catch (error) {
              toastPresets.spaces.crud.createFolderFailed({ error });
            }
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const importWorkflow = computed(
    () =>
      ({
        text: "Import workflow",
        icon: ImportWorkflowIcon,
        metadata: {
          id: "importWorkflow",
          handler: async () => {
            const items: string[] | null = await importToWorkflowGroup({
              projectId: projectId.value,
              importType: "WORKFLOW",
            });
            if (items && items.length > 0) {
              setCurrentSelectedItemIds(items);
            }
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const importFiles = computed(
    () =>
      ({
        text: "Add files",
        icon: AddFileIcon,
        metadata: {
          id: "importFiles",
          handler: async () => {
            const items: string[] | null = await importToWorkflowGroup({
              projectId: projectId.value,
              importType: "FILES",
            });
            if (items && items.length > 0) {
              setCurrentSelectedItemIds(items);
            }
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const reloadAction = computed(
    () =>
      ({
        text: "Reload",
        icon: ReloadIcon,
        metadata: {
          id: "reload",
          handler: () => {
            if (projectId) {
              fetchWorkflowGroupContent({
                projectId: projectId.value,
              });
            }
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const exportItem = computed(
    () =>
      ({
        text: "Export",
        icon: FileExportIcon,
        disabled: doesSelectionContainFile.value || isSelectionMultiple.value,
        metadata: {
          id: "export",
          handler: () => {
            exportSpaceItem({
              projectId: projectId.value,
              itemId: selectedItemIds.value[0],
            });
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const duplicateItem = computed(
    () =>
      ({
        text: "Duplicate",
        icon: DuplicateIcon,
        title: options.anchorItem?.isOpen
          ? `Open ${openFileType} cannot be duplicated.`
          : "",
        disabled: options.anchorItem?.isOpen,
        metadata: {
          id: "duplicate",
          handler: () => onDuplicateItems(selectedItemIds.value),
        },
      }) satisfies MenuItemWithHandler,
  );

  const renameItem = computed(() => {
    if (!options.anchorItem || !options.createRenameOption) {
      return { text: "" };
    }
    return options.createRenameOption(options.anchorItem, {
      title: options.anchorItem.isOpen
        ? `Open ${openFileType} cannot be renamed`
        : "",
      icon: RenameIcon,
      hotkeyText: hotkeys.formatHotkeys(["F2"]),
    });
  });

  const deleteItem = computed(() => {
    if (!options.anchorItem || !options.createDeleteOption) {
      return { text: "" };
    }
    const customProps: Partial<MenuItem> = {
      title: options.anchorItem.canBeDeleted
        ? ""
        : "Open folders cannot be deleted",
      icon: DeleteIcon,
      hotkeyText: hotkeys.formatHotkeys(["Delete"]),
    };

    if (options.canSoftDelete) {
      customProps.text = "Move to recycle bin";
    }

    return options.createDeleteOption(options.anchorItem, customProps);
  });

  const createWorkflow = computed(
    () =>
      ({
        text: "Create workflow",
        icon: PlusIcon,
        disabled: isLoadingContent.value,
        metadata: {
          id: "createWorkflow",
          handler: () => {
            setCreateWorkflowModalConfig({
              isOpen: true,
              projectId: projectId.value,
            });
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const downloadToLocalSpace = computed(
    () =>
      ({
        text: "Download",
        icon: CloudDownloadIcon,
        disabled: isSelectionEmpty.value,
        title: isSelectionEmpty.value
          ? "Select at least one file to download to local space."
          : "Download to local space",
        metadata: {
          id: "downloadToLocalSpace",
          handler: () => {
            moveToLocalProviderFromHub({
              projectId: projectId.value,
            });
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const downloadFromHubInBrowser = computed(() => {
    let tooltip = "Download to disk";
    if (isSelectionEmpty.value) {
      tooltip = "Select a file to download.";
    } else if (isSelectionMultiple.value) {
      tooltip =
        "Multiple selection is not supported for downloads in the browser.";
    }

    return {
      text: "Download",
      icon: CloudDownloadIcon,
      disabled: isSelectionEmpty.value || isSelectionMultiple.value,
      title: tooltip,
      metadata: {
        id: "downloadInBrowser",
        handler: () => {
          const itemId = selectedItemIds.value[0];
          const name =
            getWorkflowGroupContent(projectId.value)?.items.find(
              (item) => item.id === itemId,
            )?.name ?? "Unknown";

          startDownload({ itemId, name });
        },
      },
    } satisfies MenuItemWithHandler;
  });

  const moveToSpace = computed(
    () =>
      ({
        text: "Move to...",
        icon: MoveToSpaceIcon,
        disabled: isSelectionEmpty.value,
        title: isSelectionEmpty.value
          ? "Select at least one item to move."
          : undefined,
        metadata: {
          id: "moveToSpace",
          handler: () => {
            moveOrCopyToSpace({
              projectId: projectId.value,
              isCopy: false,
              itemIds: selectedItemIds.value,
            }).catch((error) => {
              const { toastPresets } = getToastPresets();
              toastPresets.spaces.crud.moveItemsFailed({ error });
            });
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const copyToSpace = computed(
    () =>
      ({
        text: "Copy to...",
        icon: CopyIcon,
        disabled: isSelectionEmpty.value,
        title: isSelectionEmpty.value
          ? "Select at least one item to copy."
          : undefined,
        metadata: {
          id: "copyToSpace",
          handler: () => {
            moveOrCopyToSpace({
              projectId: projectId.value,
              isCopy: true,
              itemIds: selectedItemIds.value,
            }).catch((error) => {
              const { toastPresets } = getToastPresets();
              toastPresets.spaces.crud.copyItemsFailed({ error });
            });
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const uploadToHubInBrowser = computed(
    () =>
      ({
        text: "Upload",
        icon: CloudUploadIcon,
        metadata: {
          id: "upload",
          handler: async () => {
            await startUpload();
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const uploadToHubFromLocalSpace = computed(
    () =>
      ({
        text: "Upload",
        icon: CloudUploadIcon,
        disabled: isSelectionEmpty.value,
        title: isSelectionEmpty.value
          ? "Select at least one file to upload."
          : undefined,
        metadata: {
          id: "upload",
          handler: async () => {
            const uploadResult = await moveToHubFromLocalProvider({
              itemIds: selectedItemIds.value,
            });

            if (!uploadResult || uploadResult.remoteItemIds.length === 0) {
              return;
            }

            const $toast = getToastsProvider();
            const { revealMultipleItems } = useRevealInSpaceExplorer($router);
            $toast.show({
              headline: "Upload complete",
              type: "success",
              buttons: [
                {
                  icon: RevealInSpaceIcon,
                  text: "Reveal in space explorer",
                  callback: () => {
                    revealMultipleItems({
                      providerId: uploadResult.destinationProviderId,
                      spaceId: uploadResult.destinationSpaceId,
                      itemIdsToReveal: uploadResult.remoteItemIds,
                    });
                  },
                },
              ],
            });
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const openInBrowserAction = computed(
    () =>
      ({
        text: `Open in ${providerType.value}`,
        icon: LinkExternal,
        disabled: isSelectionEmpty.value || isSelectionMultiple.value,
        title: isSelectionEmpty.value
          ? `Select one file to open in ${providerType.value}.`
          : undefined,
        metadata: {
          id: "openInBrowser",
          handler: () => {
            openInBrowser({
              projectId: projectId.value,
              itemId: selectedItemIds.value[0],
            });
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const openAPIDefinitionAction = computed(
    () =>
      ({
        text: "Open API Definition",
        icon: LinkExternal,
        disabled: isSelectionEmpty.value || isSelectionMultiple.value,
        title: isSelectionEmpty.value
          ? "Select one workflow to open in server."
          : undefined,
        metadata: {
          id: "openAPIDefinition",
          handler: () => {
            openAPIDefinition({
              projectId: projectId.value,
              itemId: selectedItemIds.value[0],
            });
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const openPermissionsDialogAction = computed(
    () =>
      ({
        text: "Permissions",
        icon: KeyIcon,
        disabled: isSelectionEmpty.value || isSelectionMultiple.value,
        title: isSelectionEmpty.value
          ? "View and edit access permissions"
          : undefined,
        metadata: {
          id: "openPermissionsDialog",
          handler: () => {
            openPermissionsDialog({
              projectId: projectId.value,
              itemId: selectedItemIds.value[0],
            });
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const displayDeploymentsAction = computed(
    () =>
      ({
        text: "Display schedules and jobs",
        icon: DeploymentIcon,
        disabled: isSelectionEmpty.value || isSelectionMultiple.value,
        title: isSelectionEmpty.value
          ? "Select a file to display schedules and jobs."
          : undefined,
        metadata: {
          id: "displayDeployments",
          handler: () => {
            displayDeployments({
              projectId: projectId.value,
              itemId: selectedItemIds.value[0],
              itemName: options.anchorItem?.name ?? "",
            });
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  const executeWorkflowAction = computed(
    () =>
      ({
        text: "Execute",
        icon: CirclePlayIcon,
        disabled: isSelectionEmpty.value || isSelectionMultiple.value,
        title: isSelectionEmpty.value
          ? "Select a file to execute a workflow."
          : undefined,
        metadata: {
          id: "execute",
          handler: () => {
            executeWorkflow({
              projectId: projectId.value,
              itemId: selectedItemIds.value[0],
            });
          },
        },
      }) satisfies MenuItemWithHandler,
  );

  return {
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
    moveToSpace,
    copyToSpace,
    uploadToHubFromLocalSpace,
    openInBrowserAction,
    openAPIDefinitionAction,
    openPermissionsDialogAction,
    displayDeploymentsAction,
    executeWorkflowAction,
    uploadToHubInBrowser,
    downloadFromHubInBrowser,
  };
};
