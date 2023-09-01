import type { Dispatch } from "vuex";
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
