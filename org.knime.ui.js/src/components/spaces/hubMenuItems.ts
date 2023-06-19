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
  disabledDownloadToLocalSpace: boolean,
  projectId: string,
  selectedItems: Array<string>
): ActionMenuItem => ({
  id: "downloadToLocalSpace",
  text: "Download to local space",
  icon: CloudDownloadIcon,
  disabled: disabledDownloadToLocalSpace,
  title: disabledDownloadToLocalSpace
    ? "Select at least one file to download."
    : null,
  execute: () => {
    dispatch("spaces/copyBetweenSpaces", {
      projectId,
      itemIds: selectedItems,
    });
  },
});

export const buildHubUploadMenuItems = (
  dispatch: Dispatch,
  disableUploadToHub: boolean,
  hasActiveHubSession: boolean,
  projectId: string,
  selectedItems: string[],
  disconnectedSpaceProviders: SpaceProvider[]
  // eslint-disable-next-line max-params
): ActionMenuItem[] => {
  const uploadToHub = {
    id: "uploadToHub",
    text: "Upload to Hub",
    icon: CloudUploadIcon,
    disabled: !hasActiveHubSession || disableUploadToHub,
    title: hasActiveHubSession
      ? (disableUploadToHub && "Select at least one file to upload.") || null
      : "Login is required to upload to hub.",
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

  const connectToHub = {
    id: "connectToHub",
    text: "Connect to Hub",
    icon: CloudLoginIcon,
    hidden: disconnectedSpaceProviders.length === 0,
    execute: null,
    children: disconnectedSpaceProviders.map(createConnectToHubItem),
  };

  return [uploadToHub, connectToHub];
};
