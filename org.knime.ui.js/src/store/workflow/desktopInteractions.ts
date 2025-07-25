import { useEventBus } from "@vueuse/core";
import { API } from "@api";
import { defineStore } from "pinia";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";

import { useApplicationStore } from "@/store/application/application";
import { useCanvasStateTrackingStore } from "@/store/application/canvasStateTracking";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useSelectionStore } from "@/store/selection";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";

import { useComponentInteractionsStore } from "./componentInteractions";
import { useWorkflowStore } from "./workflow";

/**
 * This store is merged with the workflow store.
 * It holds all calls from the workflow store to the local Analytics Platform.
 */
export const useDesktopInteractionsStore = defineStore("desktopInteractions", {
  actions: {
    /* See docs in API */
    async saveProject() {
      const { projectId } = useWorkflowStore().getProjectAndWorkflowIds;

      const result = await API.desktop.saveProject({
        projectId,
      });

      if (result) {
        const workflowSavedBus = useEventBus("workflow-saved");
        workflowSavedBus.emit();
      }

      return result;
    },

    /* Tell the backend to unload this project from memory */
    async closeProject(closingProjectId: string) {
      const nextProjectId = useApplicationStore().getNextProjectId({
        closingProjectIds: [closingProjectId],
      });

      const canContinue = await useNodeConfigurationStore().autoApplySettings();
      if (!canContinue) {
        return;
      }

      const didClose = await API.desktop.closeProject({
        closingProjectId,
        nextProjectId,
      });

      if (!didClose) {
        return;
      }

      useComponentInteractionsStore().clearProcessedUpdateNotification({
        projectId: closingProjectId,
      });
      useCanvasStateTrackingStore().removeCanvasState(closingProjectId);
    },

    async forceCloseProjects({ projectIds }: { projectIds: string[] }) {
      await API.desktop.forceCloseProjects({ projectIds });

      return useApplicationStore().getNextProjectId({
        closingProjectIds: projectIds,
      });
    },

    /* See docs in API */
    async openNodeConfiguration(nodeId: string) {
      const { activeWorkflow } = useWorkflowStore();
      const { version: versionId } = activeWorkflow!.info;

      const settingsChanged = await API.desktop.openNodeDialog({
        projectId: activeWorkflow!.projectId,
        versionId: versionId ?? CURRENT_STATE_VERSION,
        nodeId,
      });

      // after dialog is closed, check if the node was selected and rerender port views
      const selectedNode = useSelectionStore().singleSelectedNode;
      if (settingsChanged && selectedNode) {
        useNodeConfigurationStore().updateTimestamp();
      }
    },

    /* See docs in API */
    openFlowVariableConfiguration(nodeId: string) {
      API.desktop.openLegacyFlowVariableDialog({
        projectId: useWorkflowStore().activeWorkflow!.projectId,
        nodeId,
      });
    },

    /* See docs in API */
    openLayoutEditor() {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;

      API.desktop.openLayoutEditor({ projectId, workflowId });
    },

    /* See docs in API */
    openLayoutEditorByNodeId({ nodeId }: { nodeId: string }) {
      const { projectId } = useWorkflowStore().getProjectAndWorkflowIds;

      API.desktop.openLayoutEditor({ projectId, workflowId: nodeId });
    },

    async saveProjectAs() {
      const { projectId } = useWorkflowStore().getProjectAndWorkflowIds;

      await API.desktop.saveProjectAs({ projectId });
      // refresh space after save workflow
      useSpaceOperationsStore().fetchWorkflowGroupContent({
        projectId: useApplicationStore().activeProjectId!,
      });
    },
  },
});
