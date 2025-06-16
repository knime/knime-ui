import type { KnimeNode } from "@/api/custom-types";
import { isNodeComponent } from "@/util/nodeUtil";

import CompositeViewActions from "./CompositeViewActions.vue";
import DataAppsIcon from "./DataAppsIcon.svg";

type CompositeViewActions = {
  icon: any;
  label: string;
  extraComponent: typeof CompositeViewActions;
  extraComponentProps: InstanceType<typeof CompositeViewActions>["$props"];
};

export const useCompositeViewActions = (
  node: KnimeNode,
): CompositeViewActions | null => {
  return isNodeComponent(node) && node.hasView
    ? {
        icon: DataAppsIcon,
        label: "Data App View",
        extraComponent: CompositeViewActions,
        extraComponentProps: {
          componentNode: node,
        },
      }
    : null;
};
