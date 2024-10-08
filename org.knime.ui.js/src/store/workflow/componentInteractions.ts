import type { ActionTree, MutationTree } from "vuex";

import LoadIcon from "@knime/styles/img/icons/load.svg";

import { API } from "@/api";
import { UpdateLinkedComponentsResult } from "@/api/gateway-api/generated-api";
import { getToastsProvider } from "@/plugins/toasts";
import { showErrorToast } from "@/util/errorHandling";
import type { RootStoreState } from "../types";

import type { WorkflowState } from "./index";
import { getProjectAndWorkflowIds } from "./util";

const TOAST_ID_PREFIX = "LINK_UPDATE";
const TOAST_HEADLINE = "Linked components";
const $toast = getToastsProvider();

const pluralize = (text: string, count: number) =>
  count > 1 ? `${text}s` : text;

interface State {
  processedUpdateNotifications: Record<string, boolean>;
}
declare module "./index" {
  interface WorkflowState extends State {}
}

export const state = (): State => ({
  processedUpdateNotifications: {},
});

export const mutations: MutationTree<WorkflowState> = {
  setProcessedNotification(state, { projectId, value }) {
    state.processedUpdateNotifications[projectId] = value;
  },
};

export const actions: ActionTree<WorkflowState, RootStoreState> = {
  async checkForLinkedComponentUpdates(
    { state, commit, dispatch, getters },
    { auto = false } = {},
  ) {
    const isWritable = getters.isWritable;
    const shouldCheckForUpdates =
      isWritable && state.activeWorkflow!.info.containsLinkedComponents;

    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    const hasAlreadyChecked = state.processedUpdateNotifications[projectId];

    if (!shouldCheckForUpdates || (hasAlreadyChecked && auto)) {
      return;
    }

    try {
      const updatables = await API.workflow.getUpdatableLinkedComponents({
        projectId,
        workflowId,
      });

      if (updatables.length === 0) {
        if (!auto) {
          $toast.show({
            id: `${TOAST_ID_PREFIX}__ALL_UP_TO_DATE`,
            type: "success",
            headline: TOAST_HEADLINE,
            message: "No updates available",
          });
        }

        return;
      }

      const hasExecutedNodes = updatables.some(
        (updatable) => updatable.isExecuted,
      );
      const nodeIds = updatables.map((updatable) => updatable.id);

      const message = `You have ${nodeIds.length} ${pluralize(
        "update",
        nodeIds.length,
      )} available`;

      const withUpdateDisclaimer = hasExecutedNodes
        ? `${message}. Reset ${pluralize(
            "component",
            nodeIds.length,
          )} and update now?`
        : message;

      $toast.show({
        id: `${TOAST_ID_PREFIX}__CHECKING`,
        type: "warning",
        headline: TOAST_HEADLINE,
        message: withUpdateDisclaimer,
        buttons: [
          {
            icon: LoadIcon,
            text: hasExecutedNodes ? "Reset and update" : "Update",
            callback: async () => {
              await dispatch("clearComponentUpdateToasts");
              await dispatch("updateComponents", { nodeIds });
            },
          },
        ],
        autoRemove: false,
      });
      commit("setProcessedNotification", { projectId, value: true });
    } catch (error) {
      $toast.show({
        id: `${TOAST_ID_PREFIX}__CHECKING_FAILED`,
        type: "error",
        headline: TOAST_HEADLINE,
        message: "Problem checking for linked component updates",
        autoRemove: false,
      });
    }
  },

  async updateComponents({ state }, { nodeIds }) {
    const updateStartedToastId = $toast.show({
      id: `${TOAST_ID_PREFIX}__STARTED`,
      headline: TOAST_HEADLINE,
      message: "Updating...",
      autoRemove: false,
    });

    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    const result = await API.workflowCommand.UpdateLinkedComponents({
      projectId,
      workflowId,
      nodeIds,
    });

    $toast.remove(updateStartedToastId);

    if (result.status === UpdateLinkedComponentsResult.StatusEnum.Error) {
      showErrorToast({
        id: `${TOAST_ID_PREFIX}__ERROR`,
        headline: TOAST_HEADLINE,
        problemDetails: {
          title: `Couldn't update linked ${pluralize(
            "component",
            nodeIds.length,
          )}. Please try again.`,
          details: result.details,
        },
      });
    } else {
      const message =
        result.status === UpdateLinkedComponentsResult.StatusEnum.Success
          ? "Updated."
          : "Everything up-to-date.";
      $toast.show({
        headline: TOAST_HEADLINE,
        message,
        id: `${TOAST_ID_PREFIX}__SUCCESS`,
        type: "success",
        autoRemove: true,
      });
    }
  },

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

  clearComponentUpdateToasts() {
    const $toast = getToastsProvider();
    $toast.removeBy((toast) => (toast.id ?? "").startsWith(TOAST_ID_PREFIX));
  },

  clearProcessedUpdateNotification({ commit }, { projectId }) {
    commit("setProcessedNotification", { projectId, value: false });
  },

  lockSubnode({ state }, { nodeId }) {
    const { projectId } = getProjectAndWorkflowIds(state);
    API.desktop.openLockSubnodeDialog({ projectId, nodeId });
  },

  unlockSubnode({ state }, { nodeId }) {
    const { projectId } = getProjectAndWorkflowIds(state);
    return API.desktop.unlockSubnode({ projectId, nodeId });
  },
};
