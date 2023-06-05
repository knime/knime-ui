import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import type { Workflow } from "@/api/gateway-api/generated-api";
import type { KnimeNode } from "@/api/gateway-api/custom-types";

import {
  actions as jsonPatchActions,
  mutations as jsonPatchMutations,
} from "@/store-plugins/json-patch";

import type { TooltipDefinition } from "@/composables/useTooltip";
import { geometry } from "@/util/geometry";

import type { RootStoreState } from "../types";
import { getProjectAndWorkflowIds } from "./util";
import * as floatingMenus from "./floatingMenus";
import * as desktopInteractions from "./desktopInteractions";
import * as execution from "./execution";
import * as moving from "./moving";
import * as nodeInteractions from "./nodeInteractions";
import * as annotationInteractions from "./annotationInteractions";
import * as clipboardInteractions from "./clipboardInteractions";

export interface WorkflowState {
  activeWorkflow:
    | (Omit<Workflow, "nodes"> & {
        projectId: string;
        nodes: Record<string, KnimeNode>;
      })
    | null;
  activeSnapshotId: string | null;
  tooltip: TooltipDefinition | null;
}

/**
 * The workflow store holds a workflow graph and the associated tooltips.
 * The store is split up into several files.
 *
 * A workflow can either be contained in a component / metanode, or it can be the top level workflow.
 * Note that the notion of "workflow" is different from what users call a "KNIME workflow".
 * The technical term for the latter in this application is "project".
 */
export const state = (): WorkflowState => ({
  ...execution.state(),
  ...floatingMenus.state(),
  ...desktopInteractions.state(),
  ...moving.state(),
  ...nodeInteractions.state(),
  ...clipboardInteractions.state(),
  ...annotationInteractions.state(),
  activeWorkflow: null,
  activeSnapshotId: null,
  // TODO: NXT-1143 find a better place for the tooltip logic
  // maybe use an event that bubbles to the top (workflow canvas?)
  tooltip: null,
});

export const mutations: MutationTree<WorkflowState> = {
  ...jsonPatchMutations,
  ...execution.mutations,
  ...floatingMenus.mutations,
  ...desktopInteractions.mutations,
  ...moving.mutations,
  ...nodeInteractions.mutations,
  ...clipboardInteractions.mutations,
  ...annotationInteractions.mutations,

  setActiveWorkflow(state, workflow) {
    state.activeWorkflow = workflow;
  },
  setActiveSnapshotId(state, id) {
    state.activeSnapshotId = id;
  },
  setTooltip(state, tooltip) {
    state.tooltip = tooltip;
  },
};

export const actions: ActionTree<WorkflowState, RootStoreState> = {
  ...jsonPatchActions,
  ...execution.actions,
  ...floatingMenus.actions,
  ...desktopInteractions.actions,
  ...moving.actions,
  ...nodeInteractions.actions,
  ...clipboardInteractions.actions,
  ...annotationInteractions.actions,

  undo({ state }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    return API.workflow.undoWorkflowCommand({ projectId, workflowId });
  },

  redo({ state }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    return API.workflow.redoWorkflowCommand({ projectId, workflowId });
  },
  /**
   * Deletes all selected objects and displays an error message for the objects, that cannot be deleted.
   * If the objects can be deleted a deselect event is fired.
   */
  async deleteSelectedObjects({ state, rootGetters, dispatch }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    const selectedNodes = rootGetters["selection/selectedNodes"];
    const selectedConnections = rootGetters["selection/selectedConnections"];
    const selectedAnnotationIds =
      rootGetters["selection/selectedAnnotationIds"];

    const deletableNodeIds = selectedNodes
      .filter((node) => node.allowedActions.canDelete)
      .map((node) => node.id);
    const nonDeletableNodeIds = selectedNodes
      .filter((node) => !node.allowedActions.canDelete)
      .map((node) => node.id);
    const deletableConnectionIds = selectedConnections
      .filter((connection) => connection.allowedActions.canDelete)
      .map((connection) => connection.id);
    const nonDeletableConnectionIds = selectedConnections
      .filter((connection) => !connection.allowedActions.canDelete)
      .map((connection) => connection.id);

    if (
      deletableNodeIds.length ||
      deletableConnectionIds.length ||
      selectedAnnotationIds.length
    ) {
      await API.workflowCommand.Delete({
        projectId,
        workflowId,
        nodeIds: deletableNodeIds.length ? deletableNodeIds : [],
        connectionIds: deletableConnectionIds.length
          ? deletableConnectionIds
          : [],
        annotationIds: selectedAnnotationIds.length
          ? selectedAnnotationIds
          : [],
      });

      await dispatch("selection/deselectAllObjects", null, { root: true });
    }

    const messages = [];
    if (nonDeletableNodeIds.length) {
      messages.push(
        `The following nodes can’t be deleted: [${nonDeletableNodeIds.join(
          ", "
        )}]`
      );
    }

    if (nonDeletableConnectionIds.length) {
      messages.push(
        `The following connections can’t be deleted: [${nonDeletableConnectionIds.join(
          ", "
        )}]`
      );
    }

    if (messages.length) {
      window.alert(messages.join(" \n"));
    }
  },

  async collapseToContainer(
    { state, rootGetters, dispatch },
    { containerType }
  ) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    const selectedNodeIds = rootGetters["selection/selectedNodeIds"];
    const selectedNodes = rootGetters["selection/selectedNodes"];
    const selectedAnnotationIds =
      rootGetters["selection/selectedAnnotationIds"];
    const isResetRequired = selectedNodes.some(
      (node) => node.allowedActions.canCollapse === "resetRequired"
    );

    if (isResetRequired) {
      if (
        !window.confirm(
          `Creating this ${containerType} will reset executed nodes.`
        )
      ) {
        return;
      }
    }

    // 1. deselect all objects
    await dispatch("selection/deselectAllObjects", null, { root: true });

    // 2. send request
    const { newNodeId } = await API.workflowCommand.Collapse({
      containerType,
      projectId,
      workflowId,
      nodeIds: selectedNodeIds,
      annotationIds: selectedAnnotationIds,
    });

    // 3. select new container node, if user hasn't selected something else in the meantime
    if (rootGetters["selection/isSelectionEmpty"]) {
      await dispatch("selection/selectNode", newNodeId, { root: true });
      await dispatch("openNameEditor", newNodeId);
    }
  },

  async expandContainerNode({ state, rootGetters, dispatch }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    const selectedNode = rootGetters["selection/singleSelectedNode"];

    if (selectedNode.allowedActions.canExpand === "resetRequired") {
      if (
        !window.confirm(
          `Expanding this ${selectedNode.kind} will reset executed nodes.`
        )
      ) {
        return;
      }
    }

    // 1. deselect all objects
    await dispatch("selection/deselectAllObjects", null, { root: true });

    // 2. send request
    const { expandedNodeIds, expandedAnnotationIds } =
      await API.workflowCommand.Expand({
        projectId,
        workflowId,
        nodeId: selectedNode.id,
      });

    // 3. select expanded nodes, if user hasn't selected something else in the meantime
    if (rootGetters["selection/isSelectionEmpty"]) {
      await dispatch("selection/selectNodes", expandedNodeIds, { root: true });
      await dispatch("selection/selectAnnotations", expandedAnnotationIds, {
        root: true,
      });
    }
  },
};

export const getters: GetterTree<WorkflowState, RootStoreState> = {
  ...execution.getters,
  ...floatingMenus.getters,
  ...desktopInteractions.getters,
  ...moving.getters,
  ...nodeInteractions.getters,
  ...clipboardInteractions.getters,
  ...annotationInteractions.getters,

  /* Workflow is empty if it doesn't contain nodes */
  isWorkflowEmpty({ activeWorkflow }) {
    const hasNodes = Boolean(Object.keys(activeWorkflow?.nodes).length);
    const hasAnnotations = Boolean(activeWorkflow?.workflowAnnotations.length);

    return !hasNodes && !hasAnnotations;
  },

  isStreaming({ activeWorkflow }) {
    return Boolean(activeWorkflow?.info.jobManager);
  },

  isLinked({ activeWorkflow }) {
    return Boolean(activeWorkflow?.info.linked);
  },

  insideLinkedType({ activeWorkflow }) {
    if (!activeWorkflow?.parents) {
      return null;
    }
    return activeWorkflow.parents.find(({ linked }) => linked)?.containerType;
  },

  isInsideLinked(state, getters) {
    return Boolean(getters.insideLinkedType);
  },

  /* Workflow is writable, if it is not linked or inside a linked workflow */
  isWritable(state, { isLinked, isInsideLinked }) {
    const linkage = isLinked || isInsideLinked;
    // TODO: document better under which conditions a workflow is not writable
    return !linkage;
  },

  isOnHub({ activeWorkflow }) {
    return Boolean(activeWorkflow?.info.onHub);
  },

  /* returns the upper-left bound [xMin, yMin] and the lower-right bound [xMax, yMax] of the workflow */
  workflowBounds({ activeWorkflow }) {
    return geometry.getWorkflowObjectBounds(activeWorkflow || {}, {
      padding: true,
    });
  },
};
