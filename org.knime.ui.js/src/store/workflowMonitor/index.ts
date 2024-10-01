import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { sleep } from "@knime/utils";
import { API } from "@/api";
import {
  type WorkflowMonitorMessage,
  type WorkflowMonitorState as WorkflowMonitorAPIState,
} from "@/api/gateway-api/generated-api";
import type { WorkflowObject } from "@/api/custom-types";

import {
  actions as jsonPatchActions,
  mutations as jsonPatchMutations,
} from "@/store-plugins/json-patch";

import { router } from "@/router/router";
import { APP_ROUTES } from "@/router/appRoutes";

import { createStaggeredLoader } from "@/util/createStaggeredLoader";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";

import type { RootStoreState } from "../types";
import { lifecycleBus } from "../application/lifecycle-events";

export interface WorkflowMonitorState {
  /**
   * Indicates loading state when fetching the Workflow Monitor data
   */
  isLoading: boolean;
  /**
   * Indicates whether the Worflow Monitor is currently active (visible to the user)
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

export const state = (): WorkflowMonitorState => ({
  isLoading: false,
  isActive: false,
  hasLoaded: false,
  currentState: {
    errors: [],
    warnings: [],
  },
});

export const mutations: MutationTree<WorkflowMonitorState> = {
  ...jsonPatchMutations,

  setIsLoading(state, value) {
    state.isLoading = value;
  },
  setIsActive(state, value) {
    state.isActive = value;
  },
  setHasLoaded(state, value) {
    state.hasLoaded = value;
  },
  setCurrentState(state, value) {
    state.currentState = value;
  },
};

export const actions: ActionTree<WorkflowMonitorState, RootStoreState> = {
  ...jsonPatchActions,

  async activateWorkflowMonitor({ commit, dispatch, rootState }) {
    commit("setIsActive", true);

    const setLoading = createStaggeredLoader({
      firstStageCallback: () => {
        commit("setIsLoading", true);
      },
      resetCallback: () => {
        commit("setIsLoading", false);
      },
    });

    setLoading(true);
    const projectId = rootState.application.activeProjectId!;

    const { state: workflowMonitorState, snapshotId } =
      await API.workflow.getWorkflowMonitorState({
        projectId,
      });

    commit("setCurrentState", workflowMonitorState);

    setLoading(false);
    commit("setHasLoaded", true);

    API.event.subscribeEvent({
      typeId: "WorkflowMonitorStateChangeEventType",
      projectId: rootState.application.activeProjectId!,
      snapshotId,
    });

    dispatch("updateMessagesNodeTemplates");
  },

  updateMessagesNodeTemplates({ state, dispatch }) {
    const {
      currentState: { errors = [], warnings = [] },
    } = state;

    const toTemplateId = (value: WorkflowMonitorMessage) =>
      value.templateId ?? "";
    const nodeTemplateIds = errors.concat(warnings).map(toTemplateId);

    dispatch(
      "nodeTemplates/getNodeTemplates",
      { nodeTemplateIds },
      { root: true },
    );
  },

  deactivateWorkflowMonitor({ dispatch, rootState }) {
    dispatch("resetState");

    API.event.unsubscribeEventListener({
      typeId: "WorkflowMonitorStateChangeEventType",
      projectId: rootState.application.activeProjectId!,
      snapshotId: "<UNUSED>",
    });
  },

  resetState({ commit }) {
    commit("setIsActive", false);
    commit("setIsLoading", false);
    commit("setHasLoaded", false);
    commit("setCurrentState", { errors: [], warnings: [] });
  },

  async navigateToIssue(
    { rootState, dispatch },
    { message }: { message: WorkflowMonitorMessage },
  ) {
    if (!rootState.workflow.activeWorkflow) {
      // This shouldn't happen, but we check just in case this action
      // gets called when there's no workflow active
      return null;
    }

    const {
      info: { containerId: activeWorkflowId },
    } = rootState.workflow.activeWorkflow;

    // Because this action listens to the event bus and runs logic in those callbacks,
    // the promise returned by Vuex as a result of the action dispatch
    // does not resolve when the action itself is done. This makes awaiting the dispatch call
    // unintuitive because it doesn't resolve exactly when the action is completely done.
    // By using the unwrapped promise we can achieve a more consistent and intuitive behavior
    const { promise, resolve } = createUnwrappedPromise<void>();

    const selectNodeWithIssue = async (nodeId: string) => {
      await dispatch("selection/deselectAllObjects", null, { root: true });
      await dispatch("selection/selectNode", [nodeId], { root: true });
      const { position } = rootState.workflow.activeWorkflow!.nodes[nodeId];
      const workflowObject: WorkflowObject = {
        id: nodeId,
        type: "node",
        ...position,
      };

      // small wait period for the canvas to get settled
      // eslint-disable-next-line no-magic-numbers
      await sleep(300);
      await dispatch("canvas/moveObjectIntoView", workflowObject, {
        root: true,
      });
    };

    if (message.workflowId === activeWorkflowId) {
      await selectNodeWithIssue(message.nodeId!);
      resolve();
      return promise;
    }

    lifecycleBus.once("onWorkflowLoaded", async () => {
      await selectNodeWithIssue(message.nodeId!);
      resolve();
    });

    await router.push({
      name: APP_ROUTES.WorkflowPage,
      params: {
        projectId: rootState.application.activeProjectId,
        workflowId: message.workflowId,
      },
    });

    return promise;
  },
};

export const getters: GetterTree<WorkflowMonitorState, RootStoreState> = {};
