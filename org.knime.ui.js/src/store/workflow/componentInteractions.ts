import type { ActionTree } from "vuex";
import type { WorkflowState } from ".";
import type { RootStoreState } from "../types";
import { API } from "@api";
import { getProjectAndWorkflowIds } from "./util";

export const actions: ActionTree<WorkflowState, RootStoreState> = {
  async linkComponent({ state }, { nodeId }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    const success = await API.desktop.openLinkComponentDialog({
      projectId,
      workflowId,
      nodeId,
    });
    if (success) {
      // Reload the page if the component linking was successful
      await this.dispatch(
        "spaces/fetchWorkflowGroupContent",
        { projectId },
        { root: true },
      );
    }
  },

  updateComponent({ state }, { nodeId }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    API.desktop.updateComponent({
      projectId,
      workflowId,
      nodeId,
    });
  },

  async unlinkComponent({ state }, { nodeId }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    await API.workflowCommand.UpdateComponentLinkInformation({
      projectId,
      workflowId,
      nodeId,
    });
  },

  changeHubItemVersion({ state }, { nodeId }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    API.desktop.openChangeComponentHubItemVersionDialog({
      projectId,
      workflowId,
      nodeId,
    });
  },

  changeComponentLinkType({ state }, { nodeId }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    API.desktop.openChangeComponentLinkTypeDialog({
      projectId,
      workflowId,
      nodeId,
    });
  },
};
