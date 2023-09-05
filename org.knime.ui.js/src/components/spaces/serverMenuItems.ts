import type { Dispatch } from "vuex";
import CirclePlayIcon from "webapps-common/ui/assets/img/icons/circle-play.svg";
import type { ActionMenuItem } from "@/components/spaces/hubMenuItems";

import KeyIcon from "webapps-common/ui/assets/img/icons/key.svg";

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
    title: isSelectionEmpty ? "View and edit access permissions" : null,
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
    icon: CirclePlayIcon,
    disabled: isSelectionEmpty || isSelectionMultiple,
    title: isSelectionEmpty
      ? "Select a file to display schedules and jobs."
      : null,
    execute: () => {
      dispatch("spaces/displayDeployments", {
        projectId,
        itemId: selectedItems[0],
        itemName,
      });
    },
  };
};
