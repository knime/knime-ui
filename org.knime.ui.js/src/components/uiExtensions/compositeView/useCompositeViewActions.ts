import type { KnimeNode } from "@/api/custom-types";
import { workflowDomain } from "@/lib/workflow-domain";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useWorkflowStore } from "@/store/workflow/workflow";

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
  const { isActiveWorkflowFixedVersion } = useWorkflowStore();
  const { canReExecuteCompositeViews } = useUIControlsStore();
  const label =
    isActiveWorkflowFixedVersion || !canReExecuteCompositeViews
      ? "Data App View (Read-only)"
      : "Data App View";

  return workflowDomain.node.isComponent(node) && node.hasView
    ? {
        icon: DataAppsIcon,
        label,
        extraComponent: CompositeViewActions,
        extraComponentProps: {
          componentNode: node,
        },
      }
    : null;
};
