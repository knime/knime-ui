/* eslint-disable no-undefined */
import type { Dispatch } from "vuex";
import CloudUploadIcon from "webapps-common/ui/assets/img/icons/cloud-upload.svg";
import CloudLoginIcon from "webapps-common/ui/assets/img/icons/cloud-login.svg";
import CloudDownloadIcon from "webapps-common/ui/assets/img/icons/cloud-download.svg";
import LinkExternal from "webapps-common/ui/assets/img/icons/link-external.svg";
import KeyIcon from "webapps-common/ui/assets/img/icons/key.svg";
import DeploymentIcon from "webapps-common/ui/assets/img/icons/deployment.svg";
import CirclePlayIcon from "webapps-common/ui/assets/img/icons/circle-play.svg";
import MoveToSpaceIcon from "webapps-common/ui/assets/img/icons/move-from-space-to-space.svg";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";

import { SpaceProviderNS } from "@/api/custom-types";
import { SpaceProvider as BaseSpaceProvider } from "@/api/gateway-api/generated-api";
import { formatSpaceProviderName } from "./formatSpaceProviderName";

export type ActionMenuItem = MenuItem & {
  id: string;
  execute: (() => void) | null;
};

export const buildHubDownloadMenuItem = (
  dispatch: Dispatch,
  projectId: string,
  selectedItems: Array<string>,
): ActionMenuItem => {
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
      dispatch("spaces/copyBetweenSpaces", {
        projectId,
        itemIds: selectedItems,
      });
    },
  };
};

export const buildMoveToSpaceMenuItem = (
  dispatch: Dispatch,
  projectId: string,
  selectedItems: Array<string>,
): ActionMenuItem => {
  const isSelectionEmpty = selectedItems.length === 0;
  return {
    id: "moveToSpace",
    text: "Move to...",
    icon: MoveToSpaceIcon,
    disabled: isSelectionEmpty,
    title: isSelectionEmpty ? "Select at least one item to move." : undefined,
    separator: true,
    execute: () => {
      dispatch("spaces/moveOrCopyToSpace", {
        projectId,
        isCopy: false,
        itemIds: selectedItems,
      });
    },
  };
};

export const buildHubUploadMenuItems = (
  dispatch: Dispatch,
  hasActiveHubSession: boolean,
  projectId: string,
  selectedItems: string[],
  spaceProviders: Record<string, SpaceProviderNS.SpaceProvider>,
  // eslint-disable-next-line max-params
): ActionMenuItem[] => {
  const isSelectionEmpty = selectedItems.length === 0;
  const uploadToRemote = {
    id: "upload",
    text: "Upload",
    icon: CloudUploadIcon,
    disabled: !hasActiveHubSession || isSelectionEmpty,
    title: hasActiveHubSession
      ? (isSelectionEmpty && "Select at least one file to upload.") || undefined
      : "A connection to a hub is required to upload.",
    execute: () => {
      dispatch("spaces/copyBetweenSpaces", {
        projectId,
        itemIds: selectedItems,
      });
    },
  };

  const remoteSpaceProviders = Object.values(spaceProviders || {}).filter(
    (provider) => provider.type !== SpaceProviderNS.TypeEnum.LOCAL,
  );

  const disconnectedSpaceProviders = remoteSpaceProviders.filter(
    (provider) => !provider.connected,
  );

  const connectToHubItems = disconnectedSpaceProviders.map(
    (provider: SpaceProviderNS.SpaceProvider) => ({
      id: `connectToHub-${provider.id}`,
      text: formatSpaceProviderName(provider),
      execute: () => {
        dispatch("spaces/connectProvider", {
          spaceProviderId: provider.id,
        });
      },
    }),
  );

  // hide connectToHub if we don't have any items
  if (connectToHubItems.length === 0) {
    return [uploadToRemote];
  }

  const hasSingleDisconnectedProvider = disconnectedSpaceProviders.length === 1;

  const [firstItem] = connectToHubItems;

  const getConnectToHubText = () => {
    if (!hasSingleDisconnectedProvider) {
      return "Connect to";
    }

    const [provider] = disconnectedSpaceProviders;

    return provider.type === BaseSpaceProvider.TypeEnum.HUB
      ? "Connect to Hub"
      : "Connect to Server";
  };

  const connectToHub = {
    id: "connectToHub",
    text: getConnectToHubText(),
    icon: CloudLoginIcon,
    // connect on click without submenu if there is only one remote hub known
    execute: hasSingleDisconnectedProvider ? firstItem.execute : null,
    // show list of disconnected hubs if we have multiple configured
    children: hasSingleDisconnectedProvider ? undefined : connectToHubItems,
  } satisfies ActionMenuItem;

  return [uploadToRemote, connectToHub];
};

export const buildOpenInBrowserMenuItem = (
  dispatch: Dispatch,
  projectId: string,
  selectedItems: Array<string>,
  provider: SpaceProviderNS.SpaceProvider,
): ActionMenuItem => {
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
      dispatch("spaces/openInBrowser", {
        projectId,
        itemId: selectedItems[0],
      });
    },
  };
};

export const buildOpenAPIDefinitionMenuItem = (
  dispatch: Dispatch,
  projectId: string,
  selectedItems: Array<string>,
): ActionMenuItem => {
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
      dispatch("spaces/openAPIDefinition", {
        projectId,
        itemId: selectedItems[0],
      });
    },
  };
};

export const buildOpenPermissionsDialog = (
  dispatch: Dispatch,
  projectId: string,
  selectedItems: Array<string>,
): ActionMenuItem => {
  const isSelectionEmpty = selectedItems.length === 0;
  const isSelectionMultiple = selectedItems.length > 1;
  return {
    id: "openPermissionsDialog",
    text: "Permissions",
    icon: KeyIcon,
    disabled: isSelectionEmpty || isSelectionMultiple,
    title: isSelectionEmpty ? "View and edit access permissions" : undefined,
    execute: () => {
      dispatch("spaces/openPermissionsDialog", {
        projectId,
        itemId: selectedItems[0],
      });
    },
  };
};

export const buildDisplayDeploymentsMenuItem = (
  dispatch: Dispatch,
  projectId: string,
  selectedItems: Array<string>,
  itemName: string,
): ActionMenuItem => {
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
      dispatch("spaces/displayDeployments", {
        projectId,
        itemId: selectedItems[0],
        itemName,
      });
    },
  };
};

export const buildExecuteWorkflowMenuItem = (
  dispatch: Dispatch,
  projectId: string,
  selectedItems: Array<string>,
): ActionMenuItem => {
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
      dispatch("spaces/executeWorkflow", {
        projectId,
        itemId: selectedItems[0],
      });
    },
  };
};
