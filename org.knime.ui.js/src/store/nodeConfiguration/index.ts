import type { ActionTree, GetterTree, MutationTree } from "vuex";

import type { UIExtensionAPILayer } from "@knime/ui-extension-renderer";
import {
  type APILayerDirtyState,
  ApplyState,
  UIExtensionPushEvents,
  ViewState,
} from "@knime/ui-extension-service";

import { API } from "@/api";
import type { KnimeNode } from "@/api/custom-types";
import {
  type NativeNode,
  Node,
  NodeState,
} from "@/api/gateway-api/generated-api";
import type { ExtensionConfig } from "@/components/uiExtensions/common/types";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { runInEnvironment } from "@/environment";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";
import { isNativeNode, isNodeExecuting } from "@/util/nodeUtil";
import type { RootStoreState } from "../types";

export type UIExtensionPushEventDispatcher = Parameters<
  UIExtensionAPILayer["registerPushEventService"]
>[0]["dispatchPushEvent"];

/**
 * Store used to synchronize / manage the shared state and actions
 * required to interact with the "active" node configuration (displayed on the right panel).
 * It will provide the necessary functionality needed to make specific operations, such as
 * reading the dirty state, the published config data and applying settings
 */

export interface NodeConfigurationState {
  activeNodeId: string | null;
  activeExtensionConfig: ExtensionConfig | null;
  dirtyState: APILayerDirtyState;
  latestPublishedData: unknown | null;
  pushEventDispatcher: UIExtensionPushEventDispatcher;
}

export const state = (): NodeConfigurationState => ({
  activeNodeId: null,
  activeExtensionConfig: null,
  dirtyState: {
    apply: ApplyState.CLEAN,
    view: ViewState.CLEAN,
  },
  latestPublishedData: null,
  pushEventDispatcher: () => {},
});

let unwrappedPromise = createUnwrappedPromise<boolean>();

const { show: showConfirmDialog } = useConfirmDialog();

const promptApplyConfirmation = async (
  askToConfirm: boolean,
): Promise<"apply" | "discard" | "cancel"> => {
  let wasDiscarded = false;

  const prompt = () =>
    showConfirmDialog({
      title: "Unsaved configuration changes",
      message:
        "You have unsaved changes in your node configuration. Do you want to apply them?",
      doNotAskAgainText:
        "Always apply and do not ask again. <br/> (You can still change this in the preferences)",

      buttons: [
        {
          type: "cancel",
          label: "Cancel",
        },
        {
          type: "cancel",
          label: "Discard",
          flushRight: true,
          customHandler: ({ cancel }) => {
            wasDiscarded = true;
            cancel();
          },
        },
        {
          type: "confirm",
          label: "Apply",
          flushRight: true,
        },
      ],
    });

  const { confirmed, doNotAskAgain } = askToConfirm
    ? await prompt()
    : { confirmed: true, doNotAskAgain: true };

  // box was checked and setting is set to "ask"
  if (doNotAskAgain && askToConfirm) {
    await API.desktop.setConfirmNodeConfigChangesPreference(false);
  }

  if (wasDiscarded) {
    return "discard";
  }

  return confirmed ? "apply" : "cancel";
};

export const mutations: MutationTree<NodeConfigurationState> = {
  setActiveNodeId(state, value) {
    state.activeNodeId = value;
  },
  setPushEventDispatcher(state, value) {
    state.pushEventDispatcher = value;
  },
  setDirtyState(state, value) {
    state.dirtyState = { ...value };
  },
  setLatestPublishedData(state, value) {
    state.latestPublishedData = value;
  },
  setActiveExtensionConfig(state, value) {
    state.activeExtensionConfig = value;
  },
};

export const actions: ActionTree<NodeConfigurationState, RootStoreState> = {
  /**
   * Attempts to apply the changes to the node config of the given node (by id), and optionally
   * execute the node afterwards.
   */
  async applySettings(
    { state, dispatch },
    { nodeId, execute }: { nodeId: string; execute?: boolean },
  ) {
    const dispatchApplySettings = () => {
      state.pushEventDispatcher({
        eventType: UIExtensionPushEvents.EventTypes.ApplyDataEvent,
      });

      // Return a promise that will resolve once the configuration
      // changes have been applied (when `setApplyComplete` is called)
      return unwrappedPromise.promise;
    };
    const isApplied = await dispatchApplySettings();

    if (isApplied && execute) {
      await dispatch("workflow/executeNodes", [nodeId], { root: true });
    }

    return isApplied;
  },

  async autoApplySettings(
    { state, rootState, commit, dispatch, getters },
    { nextNode }: { nextNode: KnimeNode | null },
  ) {
    const activeNode = getters.activeNode;

    if (state.dirtyState.apply === ApplyState.CLEAN) {
      return true;
    }

    const canContinue = await runInEnvironment({
      DESKTOP: async () => {
        const modalResult = await promptApplyConfirmation(
          rootState.application.askToConfirmNodeConfigChanges,
        );

        // if user cancelled then re-select the same node
        if (modalResult === "cancel") {
          dispatch("selection/deselectAllObjects", null, { root: true });
          dispatch("selection/selectNode", activeNode.id, { root: true });
          return false;
        }

        if (modalResult === "apply") {
          dispatch("applySettings", { nodeId: activeNode.id });
        } else {
          dispatch("discardSettings");
        }

        commit("setActiveNodeId", nextNode?.id ?? null);
        return true;
      },

      BROWSER: () => {
        if (activeNode) {
          dispatch("applySettings", { nodeId: activeNode.id });
        }

        commit("setActiveNodeId", nextNode?.id ?? null);
        return Promise.resolve(true);
      },
    });

    return canContinue;
  },

  /**
   * Sets the result of the latest `applySettings` action call. Calling `setApplyComplete`
   * will essentially resolve the promise returned by `dispatchApplySettings`
   */
  setApplyComplete(_, isApplied: boolean) {
    unwrappedPromise.resolve(isApplied);
    unwrappedPromise = createUnwrappedPromise();
  },

  /**
   * Discard the changes made to the node configuration by resetting the dirty state back to CLEAN
   */
  discardSettings({ commit }) {
    commit("setDirtyState", {
      apply: ApplyState.CLEAN,
      view: ViewState.CLEAN,
    });
  },

  resetDirtyState({ dispatch }) {
    dispatch("discardSettings");
  },
};

export const getters: GetterTree<NodeConfigurationState, RootStoreState> = {
  activeNode(state, _, rootState): NativeNode | null {
    const { activeNodeId } = state;

    if (!activeNodeId) {
      return null;
    }

    const node = rootState.workflow.activeWorkflow?.nodes[activeNodeId];
    return node &&
      isNativeNode(node) &&
      node.dialogType === Node.DialogTypeEnum.Web
      ? node
      : null;
  },

  isConfigurationDisabled(_, getters, rootState) {
    const activeNode: NativeNode = getters.activeNode;
    const { canConfigureNodes } = rootState.uiControls;

    const isActiveNodeExecuting = activeNode && isNodeExecuting(activeNode);
    if (isActiveNodeExecuting || !canConfigureNodes || !activeNode) {
      return true;
    }

    const isExecuted =
      activeNode.state?.executionState ===
      NodeState.ExecutionStateEnum.EXECUTED;

    // when the node is executed but can't be reset it means a downstream node is now executing
    return isExecuted && !activeNode.allowedActions?.canReset;
  },
};
