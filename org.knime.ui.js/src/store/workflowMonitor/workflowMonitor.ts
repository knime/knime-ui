import { API } from "@api";
import { defineStore } from "pinia";

import { sleep } from "@knime/utils";

import type { WorkflowObject } from "@/api/custom-types";
import {
  type WorkflowMonitorState as WorkflowMonitorAPIState,
  type WorkflowMonitorMessage,
} from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import { router } from "@/router/router";
import { useApplicationStore } from "@/store/application/application";
import { lifecycleBus } from "@/store/application/lifecycle-events";
import { useCanvasStore } from "@/store/canvas";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { createStaggeredLoader } from "@/util/createStaggeredLoader";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";
import { actions as jsonPatchActions } from "../json-patch/json-patch";

export interface WorkflowMonitorState {
  /**
   * Indicates loading state when fetching the Workflow Monitor data
   */
  isLoading: boolean;
  /**
   * Indicates whether the Workflow Monitor is currently active (visible to the user)
   */
  isActive: boolean;
  /**
   * Indicates whether a loading operation has completed. This is useful to distinguish between
   * an empty list of messages because it's actually empty or just empty while it loads
   */
  hasLoaded: boolean;
  /**
   * The Workflow Manager data
   */
  currentState: WorkflowMonitorAPIState;
}

export const useWorkflowMonitorStore = defineStore("workflowMonitor", {
  state: (): WorkflowMonitorState => ({
    isLoading: false,
    isActive: false,
    hasLoaded: false,
    currentState: {
      errors: [],
      warnings: [],
    },
  }),
  actions: {
    ...jsonPatchActions,

    setIsLoading(isLoading: boolean) {
      this.isLoading = isLoading;
    },

    setIsActive(isActive: boolean) {
      this.isActive = isActive;
    },

    setHasLoaded(hasLoaded: boolean) {
      this.hasLoaded = hasLoaded;
    },

    setCurrentState(currentState: WorkflowMonitorAPIState) {
      this.currentState = currentState;
    },

    async activateWorkflowMonitor() {
      this.setIsActive(true);

      const setLoading = createStaggeredLoader({
        firstStageCallback: () => {
          this.setIsLoading(true);
        },
        resetCallback: () => {
          this.setIsLoading(false);
        },
      });

      setLoading(true);
      const projectId = useApplicationStore().activeProjectId!;

      const { state: workflowMonitorState, snapshotId } =
        await API.workflow.getWorkflowMonitorState({
          projectId,
        });

      this.setCurrentState(workflowMonitorState);

      setLoading(false);
      this.setHasLoaded(true);

      API.event.subscribeEvent({
        typeId: "WorkflowMonitorStateChangeEventType",
        projectId,
        snapshotId,
      });

      this.updateMessagesNodeTemplates();
    },

    updateMessagesNodeTemplates() {
      const {
        currentState: { errors = [], warnings = [] },
      } = this;

      const toTemplateId = (value: WorkflowMonitorMessage) =>
        value.templateId ?? "";
      const nodeTemplateIds = errors.concat(warnings).map(toTemplateId);

      useNodeTemplatesStore().getNodeTemplates({ nodeTemplateIds });
    },

    deactivateWorkflowMonitor() {
      this.resetState();

      API.event.unsubscribeEventListener({
        typeId: "WorkflowMonitorStateChangeEventType",
        projectId: useApplicationStore().activeProjectId!,
        snapshotId: "<UNUSED>",
      });
    },

    resetState() {
      this.setIsActive(false);
      this.setIsLoading(false);
      this.setHasLoaded(false);
      this.setCurrentState({ errors: [], warnings: [] });
    },

    async navigateToIssue({ message }: { message: WorkflowMonitorMessage }) {
      const workflowStore = useWorkflowStore();

      if (!workflowStore.activeWorkflow) {
        // This shouldn't happen, but we check just in case this action
        // gets called when there's no workflow active
        return null;
      }

      const {
        info: { containerId: activeWorkflowId },
      } = workflowStore.activeWorkflow;

      // Because this action listens to the event bus and runs logic in those callbacks,
      // the promise returned the store action call
      // does not resolve when the action itself is done. This makes awaiting the dispatch call
      // unintuitive because it doesn't resolve exactly when the action is completely done.
      // By using the unwrapped promise we can achieve a more consistent and intuitive behavior
      const { promise, resolve } = createUnwrappedPromise<void>();

      const selectNodeWithIssue = async (nodeId: string) => {
        useSelectionStore().deselectAllObjects();
        useSelectionStore().selectNode(nodeId);

        const { position } = workflowStore.activeWorkflow!.nodes[nodeId];
        const workflowObject: WorkflowObject = {
          id: nodeId,
          type: "node",
          ...position,
        };

        // small wait period for the canvas to get settled
        // eslint-disable-next-line no-magic-numbers
        await sleep(300);
        useCanvasStore().moveObjectIntoView(workflowObject);
      };

      if (message.workflowId === activeWorkflowId) {
        await selectNodeWithIssue(message.nodeId);
        resolve();
        return promise;
      }

      lifecycleBus.once("onWorkflowLoaded", async () => {
        await selectNodeWithIssue(message.nodeId);
        resolve();
      });

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: {
          projectId: useApplicationStore().activeProjectId,
          workflowId: message.workflowId,
        },
      });

      return promise;
    },
  },
});
