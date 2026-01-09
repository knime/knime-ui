import { API } from "@api";
import { defineStore } from "pinia";

import type { KnimeNode } from "@/api/custom-types";
import { NodeState } from "@/api/gateway-api/generated-api";
import {
  buildMiddleware,
  validateNodeExecuted,
  validatePortSupport,
} from "@/components/uiExtensions/common/output-validator";
import { getToastsProvider } from "@/plugins/toasts";
import { useApplicationStore } from "@/store/application/application";
import { useSelectionStore } from "@/store/selection";
import { ports } from "@/util/dataMappers";
import { workflowDomain } from "@/util/workflow-domain";

import { useWorkflowStore } from "./workflow";

/**
 * This store is not instantiated by Nuxt but merged with the workflow store.
 * It holds all calls from the workflow store to the API regarding execution.
 */
type ExecutionAction = Parameters<
  typeof API.node.changeNodeStates
>[0]["action"];
type LoopStateAction = Parameters<typeof API.node.changeLoopState>[0]["action"];

type NodeExecutionMode = Array<string> | "all" | "selected";

export const useExecutionStore = defineStore("execution", {
  actions: {
    changeNodeState({
      action,
      nodes,
    }: {
      action: ExecutionAction;
      nodes: NodeExecutionMode;
    }) {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;

      if (Array.isArray(nodes)) {
        // act upon a list of nodes
        return API.node.changeNodeStates({
          projectId,
          nodeIds: nodes,
          action,
          workflowId,
        });
      } else if (nodes === "all") {
        // act upon entire workflow
        return API.node.changeNodeStates({
          projectId,
          action,
          nodeIds: [],
          workflowId,
        });
      } else if (nodes === "selected") {
        // act upon selected nodes
        return API.node.changeNodeStates({
          projectId,
          nodeIds: useSelectionStore().selectedNodeIds,
          action,
          workflowId,
        });
      } else {
        throw new TypeError(
          "'nodes' has to be of type 'all' | 'selected' | Array<nodeId>]",
        );
      }
    },

    changeLoopState({
      action,
      nodeId,
    }: {
      action: LoopStateAction;
      nodeId: string;
    }) {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;

      return API.node.changeLoopState({
        projectId,
        workflowId,
        nodeId,
        action,
      });
    },

    executeNodes(nodes: NodeExecutionMode) {
      return this.changeNodeState({ action: "execute", nodes });
    },

    openLegacyPortView({
      nodeId,
      portIndex,
      executeNode = false,
    }: {
      nodeId: string;
      portIndex: number;
      executeNode?: boolean;
    }) {
      API.desktop.openLegacyPortView({
        projectId: useWorkflowStore().activeWorkflow!.projectId,
        nodeId,
        portIdx: portIndex,
        executeNode,
      });
    },

    /* Some nodes generate views from their data. The node gets executed and a Classic UI dialog opens to present this view */
    executeNodeAndOpenView(nodeId: string) {
      API.desktop.executeNodeAndOpenView({
        projectId: useWorkflowStore().activeWorkflow!.projectId,
        nodeId,
      });
    },

    openPortView({
      node,
      port,
    }: {
      node: KnimeNode;
      port: "view" | Omit<string, "view">;
    }) {
      if (port === "view") {
        this.executeNodeAndOpenView(node.id);
        return;
      }

      const portTypes = useApplicationStore().availablePortTypes;
      const selectedPortIndex = Number(port);
      const selectedPort = node.outPorts[selectedPortIndex];
      const validationResult = buildMiddleware(
        validateNodeExecuted,
        validatePortSupport,
      )({
        selectedNode: node,
        selectedPort,
        selectedPortIndex,
        portTypes,
      })();

      const showDetachErrorToast = (message: string) => {
        getToastsProvider().show({
          headline: "Error detaching output port view",
          message,
          type: "error",
        });
      };

      if (validationResult?.error?.code === "UNSUPPORTED_PORT_VIEW") {
        this.openLegacyPortView({
          nodeId: node.id,
          portIndex: selectedPortIndex,
        });
        return;
      }

      if (validationResult?.error) {
        showDetachErrorToast(
          validationResult.error.message ||
            "Check the output port view for details.",
        );
        return;
      }

      const portViews =
        useApplicationStore().availablePortTypes[
          node.outPorts[selectedPortIndex].typeId
        ].views;

      if (!portViews) {
        return;
      }

      const firstDetachableView = ports
        .toRenderablePortViewState(portViews, node, selectedPortIndex)
        .find((v) => v.detachable);

      if (firstDetachableView) {
        API.desktop.openPortView({
          projectId: useApplicationStore().activeProjectId!,
          nodeId: node.id,
          viewIndex: Number(firstDetachableView.id),
          portIndex: selectedPortIndex,
        });
      } else {
        showDetachErrorToast("Port has no detachable view");
      }
    },

    resetNodes(nodes: NodeExecutionMode) {
      return this.changeNodeState({ action: "reset", nodes });
    },

    cancelNodeExecution(nodes: NodeExecutionMode) {
      return this.changeNodeState({ action: "cancel", nodes });
    },

    /* See docs in API */
    pauseLoopExecution(nodeId: string) {
      return this.changeLoopState({ action: "pause", nodeId });
    },

    /* See docs in API */
    resumeLoopExecution(nodeId: string) {
      return this.changeLoopState({ action: "resume", nodeId });
    },

    /* See docs in API */
    stepLoopExecution(nodeId: string) {
      return this.changeLoopState({ action: "step", nodeId });
    },
  },

  getters: {
    hasExecutedNativeNode(): boolean {
      const workflowStore = useWorkflowStore();
      const nodes = Object.values(workflowStore.activeWorkflow?.nodes ?? {});

      return nodes.some(
        (node) =>
          workflowDomain.node.isNative(node) &&
          node.state?.executionState === NodeState.ExecutionStateEnum.EXECUTED,
      );
    },
  },
});
