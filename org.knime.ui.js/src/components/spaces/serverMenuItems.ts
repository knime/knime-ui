import type { Dispatch } from "vuex";
import type { ActionMenuItem } from "@/components/spaces/hubMenuItems";

import KeyIcon from "webapps-common/ui/assets/img/icons/key.svg";

export const buildOpenPermissionsDialog = (
    dispatch: Dispatch,
    projectId: string,
    itemId: string
): ActionMenuItem => ({
    id: "openPermissionsDialog",
    text: "Permissions",
    icon: KeyIcon,
    disabled: false,
    title: "View and edit access permissions",
    execute: () => {
        dispatch("spaces/openPermissionsDialog", {
        projectId,
        itemId
        });
    }
});
