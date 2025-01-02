/* eslint-disable no-undefined */
import type { MenuItem } from "@knime/components";
import CirclePlayIcon from "@knime/styles/img/icons/circle-play.svg";
import CloudDownloadIcon from "@knime/styles/img/icons/cloud-download.svg";
import CloudUploadIcon from "@knime/styles/img/icons/cloud-upload.svg";
import CopyIcon from "@knime/styles/img/icons/copy.svg";
import DeploymentIcon from "@knime/styles/img/icons/deployment.svg";
import KeyIcon from "@knime/styles/img/icons/key.svg";
import LinkExternal from "@knime/styles/img/icons/link-external.svg";
import MoveToSpaceIcon from "@knime/styles/img/icons/move-from-space-to-space.svg";

import { SpaceProviderNS } from "@/api/custom-types";
import { SpaceProvider as BaseSpaceProvider } from "@/api/gateway-api/generated-api";
import { useDeploymentsStore } from "@/store/spaces/deployments";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useSpacesStore } from "@/store/spaces/spaces";
import { getToastPresets } from "@/toastPresets";

export type ActionMenuItem = MenuItem & {
  id: string;
  execute: (() => void) | null;
};

export const buildHubDownloadMenuItem = (
  projectId: string,
  selectedItems: Array<string>,
): ActionMenuItem => {
  const { copyBetweenSpaces } = useSpacesStore();
  const isSelectionEmpty = selectedItems.length === 0;

  return {
    id: "downloadToLocalSpace",
    text: "Download",
    icon: CloudDownloadIcon,
    disabled: isSelectionEmpty,
    title: isSelectionEmpty
      ? "Select at least one file to download to local space."
      : "Download to local space",
    separator: true,
    execute: () => {
      copyBetweenSpaces({
        projectId,
        itemIds: selectedItems,
      });
    },
  };
};

export const buildMoveToSpaceMenuItem = (
  projectId: string,
  selectedItems: Array<string>,
): ActionMenuItem => {
  const { moveOrCopyToSpace } = useSpacesStore();
  const isSelectionEmpty = selectedItems.length === 0;
  return {
    id: "moveToSpace",
    text: "Move to...",
    icon: MoveToSpaceIcon,
    disabled: isSelectionEmpty,
    title: isSelectionEmpty ? "Select at least one item to move." : undefined,
    execute: () => {
      moveOrCopyToSpace({
        projectId,
        isCopy: false,
        itemIds: selectedItems,
      }).catch((error: any) => {
        const { toastPresets } = getToastPresets();
        toastPresets.spaces.crud.moveItemsFailed({ error });
      });
    },
  };
};

export const buildCopyToSpaceMenuItem = (
  projectId: string,
  selectedItems: Array<string>,
): ActionMenuItem => {
  const { moveOrCopyToSpace } = useSpacesStore();
  const isSelectionEmpty = selectedItems.length === 0;
  return {
    id: "copyToSpace",
    text: "Copy to...",
    icon: CopyIcon,
    disabled: isSelectionEmpty,
    title: isSelectionEmpty ? "Select at least one item to copy." : undefined,
    separator: true,
    execute: () => {
      moveOrCopyToSpace({
        projectId,
        isCopy: true,
        itemIds: selectedItems,
      }).catch((error: any) => {
        const { toastPresets } = getToastPresets();
        toastPresets.spaces.crud.copyItemsFailed({ error });
      });
    },
  };
};

export const buildHubUploadMenuItem = (
  projectId: string,
  selectedItems: string[],
): ActionMenuItem => {
  const { copyBetweenSpaces } = useSpacesStore();
  const isSelectionEmpty = selectedItems.length === 0;
  return {
    id: "upload",
    text: "Upload",
    icon: CloudUploadIcon,
    disabled: isSelectionEmpty,
    title: isSelectionEmpty ? "Select at least one file to upload." : undefined,
    execute: () => {
      copyBetweenSpaces({
        projectId,
        itemIds: selectedItems,
      });
    },
  };
};

export const buildOpenInBrowserMenuItem = (
  projectId: string,
  selectedItems: Array<string>,
  provider: SpaceProviderNS.SpaceProvider,
): ActionMenuItem => {
  const { openInBrowser } = useSpacesStore();
  const isSelectionEmpty = selectedItems.length === 0;
  const isSelectionMultiple = selectedItems.length > 1;

  const providerType =
    provider.type === BaseSpaceProvider.TypeEnum.HUB ? "Hub" : "WebPortal";

  return {
    id: "openInBrowser",
    text: `Open in ${providerType}`,
    icon: LinkExternal,
    disabled: isSelectionEmpty || isSelectionMultiple,
    title: isSelectionEmpty
      ? `Select one file to open in ${providerType}.`
      : undefined,
    execute: () => {
      openInBrowser({
        projectId,
        itemId: selectedItems[0],
      });
    },
  };
};

export const buildOpenAPIDefinitionMenuItem = (
  projectId: string,
  selectedItems: Array<string>,
): ActionMenuItem => {
  const { openAPIDefinition } = useSpacesStore();
  const isSelectionEmpty = selectedItems.length === 0;
  const isSelectionMultiple = selectedItems.length > 1;
  return {
    id: "openAPIDefinition",
    text: "Open API Definition",
    icon: LinkExternal,
    disabled: isSelectionEmpty || isSelectionMultiple,
    title: isSelectionEmpty
      ? "Select one workflow to open in server."
      : undefined,
    execute: () => {
      openAPIDefinition({
        projectId,
        itemId: selectedItems[0],
      });
    },
  };
};

export const buildOpenPermissionsDialog = (
  projectId: string,
  selectedItems: Array<string>,
): ActionMenuItem => {
  const { openPermissionsDialog } = useSpaceOperationsStore();
  const isSelectionEmpty = selectedItems.length === 0;
  const isSelectionMultiple = selectedItems.length > 1;
  return {
    id: "openPermissionsDialog",
    text: "Permissions",
    icon: KeyIcon,
    disabled: isSelectionEmpty || isSelectionMultiple,
    title: isSelectionEmpty ? "View and edit access permissions" : undefined,
    execute: () => {
      openPermissionsDialog({
        projectId,
        itemId: selectedItems[0],
      });
    },
  };
};

export const buildDisplayDeploymentsMenuItem = (
  projectId: string,
  selectedItems: Array<string>,
  itemName: string,
): ActionMenuItem => {
  const { displayDeployments } = useDeploymentsStore();
  const isSelectionEmpty = selectedItems.length === 0;
  const isSelectionMultiple = selectedItems.length > 1;

  return {
    id: "displayDeployments",
    text: "Display schedules and jobs",
    icon: DeploymentIcon,
    disabled: isSelectionEmpty || isSelectionMultiple,
    title: isSelectionEmpty
      ? "Select a file to display schedules and jobs."
      : undefined,
    execute: () => {
      displayDeployments({
        projectId,
        itemId: selectedItems[0],
        itemName,
      });
    },
  };
};

export const buildExecuteWorkflowMenuItem = (
  projectId: string,
  selectedItems: Array<string>,
): ActionMenuItem => {
  const { executeWorkflow } = useDeploymentsStore();
  const isSelectionEmpty = selectedItems.length === 0;
  const isSelectionMultiple = selectedItems.length > 1;

  return {
    id: "execute",
    text: "Execute",
    icon: CirclePlayIcon,
    disabled: isSelectionEmpty || isSelectionMultiple,
    title: isSelectionEmpty
      ? "Select a file to execute a workflow."
      : undefined,
    execute: () => {
      executeWorkflow({
        projectId,
        itemId: selectedItems[0],
      });
    },
  };
};
