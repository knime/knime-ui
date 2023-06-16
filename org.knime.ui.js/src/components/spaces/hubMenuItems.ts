import CloudUploadIcon from "webapps-common/ui/assets/img/icons/cloud-upload.svg";
import CloudLoginIcon from "../../../webapps-common/ui/assets/img/icons/cloud-login.svg";
import CloudDownloadIcon from "webapps-common/ui/assets/img/icons/cloud-download.svg";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";
import type { SpaceProvider } from "@/api/custom-types";
import type { Dispatch } from "vuex";

export type ActionMenuItem = MenuItem & {
  id: string;
  execute: () => void;
  hidden?: boolean;
};

export const buildHubDownloadMenuItem = (
  dispatch: Dispatch,
  projectId: string,
  selectedItems: Array<string>
): ActionMenuItem => {
  const isSelectionEmpty = selectedItems.length === 0;
  return {
    id: "downloadToLocalSpace",
    text: "Download to local space",
    icon: CloudDownloadIcon,
    disabled: isSelectionEmpty,
    title: isSelectionEmpty ? "Select at least one file to download." : null,
    execute: () => {
      dispatch("spaces/copyBetweenSpaces", {
        projectId,
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
  spaceProviders: Record<string, SpaceProvider>
  // eslint-disable-next-line max-params
): ActionMenuItem[] => {
  const isSelectionEmpty = selectedItems.length === 0;
  const uploadToHub = {
    id: "uploadToHub",
    text: "Upload to Hub",
    icon: CloudUploadIcon,
    disabled: !hasActiveHubSession || isSelectionEmpty,
    title: hasActiveHubSession
      ? (isSelectionEmpty && "Select at least one file to upload.") || null
      : "A connection to a hub is required to upload.",
    execute: () => {
      dispatch("spaces/copyBetweenSpaces", {
        projectId,
        itemIds: selectedItems,
      });
    },
  };

  const createConnectToHubItem = (provider: SpaceProvider) => {
    return {
      id: `connectToHub-${provider.id}`,
      text: provider.name,
      execute: () => {
        dispatch("spaces/connectProvider", {
          spaceProviderId: provider.id,
        });
      },
    };
  };

  const remoteSpaceProviders = Object.values(spaceProviders).filter(
    (provider) => provider.id !== "local"
  );

  const disconnectedSpaceProviders = remoteSpaceProviders.filter(
    (provider) => !provider.connected
  );

  const hasSingleRemoteSpaceProvider = remoteSpaceProviders.length === 1;

  const connectToHubItems = disconnectedSpaceProviders.map(
    createConnectToHubItem
  );

  const connectToHub = {
    id: "connectToHub",
    text: "Connect to Hub",
    icon: CloudLoginIcon,
    hidden: connectToHubItems.length === 0,
    // connect on click without submenu if there is only one remote hub known
    execute: hasSingleRemoteSpaceProvider
      ? connectToHubItems[0]?.execute
      : null,
    // show list of disconnected hubs if we have mulitple configured
    children: hasSingleRemoteSpaceProvider ? null : connectToHubItems,
  };

  return [uploadToHub, connectToHub];
};
