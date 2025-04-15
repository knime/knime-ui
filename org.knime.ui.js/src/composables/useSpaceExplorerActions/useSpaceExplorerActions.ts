/* eslint-disable no-undefined */
import { type Ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import type {
  FileExplorerContextMenu,
  FileExplorerItem,
  MenuItem,
} from "@knime/components";
import CirclePlayIcon from "@knime/styles/img/icons/circle-play.svg";
import CloudDownloadIcon from "@knime/styles/img/icons/cloud-download.svg";
import CloudUploadIcon from "@knime/styles/img/icons/cloud-upload.svg";
import CopyIcon from "@knime/styles/img/icons/copy.svg";
import DeploymentIcon from "@knime/styles/img/icons/deployment.svg";
import DuplicateIcon from "@knime/styles/img/icons/duplicate.svg";
import FileExportIcon from "@knime/styles/img/icons/file-export.svg";
import FolderPlusIcon from "@knime/styles/img/icons/folder-plus.svg";
import KeyIcon from "@knime/styles/img/icons/key.svg";
import LinkExternal from "@knime/styles/img/icons/link-external.svg";
import ListIcon from "@knime/styles/img/icons/list-thumbs.svg";
import MoveToSpaceIcon from "@knime/styles/img/icons/move-from-space-to-space.svg";
import RenameIcon from "@knime/styles/img/icons/pencil.svg";
import ReloadIcon from "@knime/styles/img/icons/reload.svg";
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
import { useMovingItems } from "@/components/spaces/useMovingItems";
import { useRevealInSpaceExplorer } from "@/components/spaces/useRevealInSpaceExplorer";
import { isBrowser } from "@/environment";
import { getToastsProvider } from "@/plugins/toasts";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useDeploymentsStore } from "@/store/spaces/deployments";
import { useSpaceDownloadsStore } from "@/store/spaces/downloads";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useSpacesStore } from "@/store/spaces/spaces";
import { useSpaceUploadsStore } from "@/store/spaces/uploads";
import { getToastPresets } from "@/toastPresets";

export const useSpaceExplorerActions = (
  projectId: Ref<string>,
  selectedItemIds: Ref<string[]>,
  options: {
    mode?: string;
    createRenameOption?: FileExplorerContextMenu.CreateDefaultMenuOption;
    createDeleteOption?: FileExplorerContextMenu.CreateDefaultMenuOption;
    anchorItem?: FileExplorerItem;
    providerInfo?: SpaceProviderNS.SpaceProvider | null;
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

  const createFolderAction = computed(() => ({
    id: "createFolder",
    text: "Create folder",
    icon: FolderPlusIcon,
    separator: true,
    execute: async () => {
      try {
        await createFolder({
          projectId: projectId.value,
        });
      } catch (error) {
        toastPresets.spaces.crud.createFolderFailed({ error });
      }
    },
  }));

  const importWorkflow = computed(() => ({
    id: "importWorkflow",
    text: "Import workflow",
    icon: ImportWorkflowIcon,
    execute: async () => {
      const items: string[] | null = await importToWorkflowGroup({
        projectId: projectId.value,
        importType: "WORKFLOW",
      });
      if (items && items.length > 0) {
        setCurrentSelectedItemIds(items);
      }
    },
  }));

  const importFiles = computed(() => ({
    id: "importFiles",
    text: "Add files",
    icon: AddFileIcon,
    separator: true,
    execute: async () => {
      const items: string[] | null = await importToWorkflowGroup({
        projectId: projectId.value,
        importType: "FILES",
      });
      if (items && items.length > 0) {
        setCurrentSelectedItemIds(items);
      }
    },
  }));

  const reloadAction = computed(() => ({
    id: "reload",
    text: "Reload",
    icon: ReloadIcon,
    execute: () => {
      if (projectId) {
        fetchWorkflowGroupContent({
          projectId: projectId.value,
        });
      }
    },
  }));

  const exportItem = computed(() => ({
    id: "export",
    text: "Export",
    icon: FileExportIcon,
    disabled: doesSelectionContainFile.value || isSelectionMultiple.value,
    execute: () => {
      exportSpaceItem({
        projectId: projectId.value,
        itemId: selectedItemIds.value[0],
      });
    },
  }));

  const duplicateItem = computed(() => ({
    id: "duplicate",
    text: "Duplicate",
    icon: DuplicateIcon,
    title: options.anchorItem?.isOpen
      ? `Open ${openFileType} cannot be duplicated.`
      : "",
    disabled: options.anchorItem?.isOpen,
    execute: () => onDuplicateItems(selectedItemIds.value),
  }));

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
    // TODO NXT-3468 when Desktop and Browser are in sync, the below block should not be needed anymore.
    // Instead FileExplorerContextMenu from webapps-common
    // https://bitbucket.org/KNIME/webapps-common/src/07664ef06d6ad0c800c9ab9f992daf410e4c1745/packages/components/src/components/FileExplorer/components/FileExplorerContextMenu.vue?at=master#lines-106
    // should be adapted to reflect the new default text
    if (isBrowser()) {
      customProps.text = "Move to recycle bin";
    }

    return options.createDeleteOption(options.anchorItem, customProps);
  });

  const createWorkflow = computed(() => ({
    id: "createWorkflow",
    text: "Create workflow",
    icon: PlusIcon,
    disabled: isLoadingContent.value,
    hidden: options.mode !== "mini",
    execute: () => {
      setCreateWorkflowModalConfig({
        isOpen: true,
        projectId: projectId.value,
      });
    },
  }));

  const downloadToLocalSpace = computed(() => ({
    id: "downloadToLocalSpace",
    text: "Download",
    icon: CloudDownloadIcon,
    disabled: isSelectionEmpty.value,
    title: isSelectionEmpty.value
      ? "Select at least one file to download to local space."
      : "Download to local space",
    separator: true,
    execute: () => {
      moveToLocalProviderFromHub({
        projectId: projectId.value,
      });
    },
  }));

  const downloadInBrowser = computed(() => {
    let tooltip = "Download to disk";
    if (isSelectionEmpty.value) {
      tooltip = "Select a file to download.";
    } else if (isSelectionMultiple.value) {
      tooltip =
        "Multiple selection is not supported for downloads in the browser.";
    }
    return {
      id: "downloadInBrowser",
      text: "Download",
      icon: CloudDownloadIcon,
      disabled: isSelectionEmpty.value || isSelectionMultiple.value,
      title: tooltip,
      execute: () => {
        const itemId = selectedItemIds.value[0];
        const name =
          getWorkflowGroupContent(projectId.value)?.items.find(
            (item) => item.id === itemId,
          )?.name ?? "Unknown";
        startDownload({
          itemId,
          name,
        });
      },
    };
  });

  const moveToSpace = computed(() => ({
    id: "moveToSpace",
    text: "Move to...",
    icon: MoveToSpaceIcon,
    disabled: isSelectionEmpty.value,
    title: isSelectionEmpty.value
      ? "Select at least one item to move."
      : undefined,
    execute: () => {
      moveOrCopyToSpace({
        projectId: projectId.value,
        isCopy: false,
        itemIds: selectedItemIds.value,
      }).catch((error: any) => {
        const { toastPresets } = getToastPresets();
        toastPresets.spaces.crud.moveItemsFailed({ error });
      });
    },
  }));

  const copyToSpace = computed(() => ({
    id: "copyToSpace",
    text: "Copy to...",
    icon: CopyIcon,
    disabled: isSelectionEmpty.value,
    title: isSelectionEmpty.value
      ? "Select at least one item to copy."
      : undefined,
    separator: true,
    execute: () => {
      moveOrCopyToSpace({
        projectId: projectId.value,
        isCopy: true,
        itemIds: selectedItemIds.value,
      }).catch((error: any) => {
        const { toastPresets } = getToastPresets();
        toastPresets.spaces.crud.copyItemsFailed({ error });
      });
    },
  }));

  const uploadAction = computed(() => ({
    id: "upload",
    text: "Upload",
    icon: CloudUploadIcon,
    execute: async () => {
      await startUpload();
    },
  }));

  const uploadToHub = computed(() => ({
    id: "upload",
    text: "Upload",
    icon: CloudUploadIcon,
    disabled: isSelectionEmpty.value,
    title: isSelectionEmpty.value
      ? "Select at least one file to upload."
      : undefined,
    execute: async () => {
      const uploadResult = await moveToHubFromLocalProvider({
        itemIds: selectedItemIds.value,
      });

      if (!uploadResult || uploadResult.remoteItemIds.length === 0) {
        return;
      }

      const $toast = getToastsProvider();
      const { revealInSpaceExplorer } = useRevealInSpaceExplorer($router);
      $toast.show({
        headline: "Upload complete",
        type: "success",
        buttons: [
          {
            icon: ListIcon,
            text: "Reveal in space explorer",
            callback: () => {
              revealInSpaceExplorer({
                providerId: uploadResult.destinationProviderId,
                spaceId: uploadResult.destinationSpaceId,
                itemIds: uploadResult.remoteItemIds,
              });
            },
          },
        ],
      });
    },
  }));

  const openInBrowserAction = computed(() => ({
    id: "openInBrowser",
    text: `Open in ${providerType.value}`,
    icon: LinkExternal,
    disabled: isSelectionEmpty.value || isSelectionMultiple.value,
    title: isSelectionEmpty.value
      ? `Select one file to open in ${providerType.value}.`
      : undefined,
    execute: () => {
      openInBrowser({
        projectId: projectId.value,
        itemId: selectedItemIds.value[0],
      });
    },
  }));

  const openAPIDefinitionAction = computed(() => ({
    id: "openAPIDefinition",
    text: "Open API Definition",
    icon: LinkExternal,
    disabled: isSelectionEmpty.value || isSelectionMultiple.value,
    title: isSelectionEmpty.value
      ? "Select one workflow to open in server."
      : undefined,
    execute: () => {
      openAPIDefinition({
        projectId: projectId.value,
        itemId: selectedItemIds.value[0],
      });
    },
  }));

  const openPermissionsDialogAction = computed(() => ({
    id: "openPermissionsDialog",
    text: "Permissions",
    icon: KeyIcon,
    disabled: isSelectionEmpty.value || isSelectionMultiple.value,
    title: isSelectionEmpty.value
      ? "View and edit access permissions"
      : undefined,
    execute: () => {
      openPermissionsDialog({
        projectId: projectId.value,
        itemId: selectedItemIds.value[0],
      });
    },
  }));

  const displayDeploymentsAction = computed(() => ({
    id: "displayDeployments",
    text: "Display schedules and jobs",
    icon: DeploymentIcon,
    disabled: isSelectionEmpty.value || isSelectionMultiple.value,
    title: isSelectionEmpty.value
      ? "Select a file to display schedules and jobs."
      : undefined,
    execute: () => {
      displayDeployments({
        projectId: projectId.value,
        itemId: selectedItemIds.value[0],
        itemName: options.anchorItem?.name ?? "",
      });
    },
  }));

  const executeWorkflowAction = computed(() => ({
    id: "execute",
    text: "Execute",
    icon: CirclePlayIcon,
    disabled: isSelectionEmpty.value || isSelectionMultiple.value,
    title: isSelectionEmpty.value
      ? "Select a file to execute a workflow."
      : undefined,
    execute: () => {
      executeWorkflow({
        projectId: projectId.value,
        itemId: selectedItemIds.value[0],
      });
    },
  }));

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
  };
};
