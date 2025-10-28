import { storeToRefs } from "pinia";

import * as API from "@/api/desktop-api/desktop-api";
import { getToastsProvider } from "@/plugins/toasts";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import type { HubComponent } from "@/store/hubComponents";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { geometry } from "@/util/geometry";

/**
 * Add a Hub component to the workflow via double-click
 * Uses the same HTTPS URL import as drag & drop
 */
export const useAddHubComponentToWorkflow = () => {
  const $toast = getToastsProvider();
  const { isWritable, activeWorkflow } = storeToRefs(useWorkflowStore());

  return async (component: HubComponent) => {
    // Do not try to add to read-only workflow
    if (!isWritable.value) {
      return;
    }

    const { singleSelectedNode } = storeToRefs(useSelectionStore());
    const canvasStore = useCurrentCanvasStore();

    // Calculate position - next to selected node or in free space
    const position = singleSelectedNode.value
      ? {
          // eslint-disable-next-line no-magic-numbers
          x: singleSelectedNode.value.position.x + 120,
          y: singleSelectedNode.value.position.y,
        }
      : geometry.findFreeSpaceAroundCenterWithFallback({
          visibleFrame: canvasStore.value.getVisibleFrame,
          nodes: activeWorkflow.value!.nodes,
        });

    // Extract component ID (remove * prefix for short URL)
    const componentId = component.id;
    const shortId = componentId.startsWith("*")
      ? componentId.substring(1)
      : componentId;

    // Use HTTPS URL - same as drag & drop
    const uri = `https://hub.knime.com/s/${shortId}`;

    try {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;
      await API.importURIAtWorkflowCanvas({
        uri,
        projectId,
        workflowId,
        x: position.x,
        y: position.y,
      });
    } catch (error) {
      consola.error({ message: "Failed to import Hub component", error, uri });
      $toast.show({
        headline: "Cannot Add Hub Component",
        message:
          "To add Hub components, mount the KNIME Hub in the Space Explorer first, then drag components from there.",
        type: "warning",
        autoRemove: true,
      });
    }
  };
};
