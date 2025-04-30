import { API } from "@api";
import { defineStore } from "pinia";

import type {
  APILayerDirtyState,
  UIExtensionPushEvents,
} from "@knime/ui-extension-renderer/api";
import type { UIExtensionAPILayer } from "@knime/ui-extension-renderer/vue";

import {
  type NativeNode,
  Node,
  NodeState,
} from "@/api/gateway-api/generated-api";
import type { ExtensionConfig } from "@/components/uiExtensions/common/types";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { runInEnvironment } from "@/environment";
import { getToastsProvider } from "@/plugins/toasts";
import { useApplicationStore } from "@/store/application/application";
import { useSelectionStore } from "@/store/selection";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useExecutionStore } from "@/store/workflow/execution";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";
import { isNativeNode, isNodeExecuting } from "@/util/nodeUtil";

let unwrappedPromise = createUnwrappedPromise<boolean>();
const $toast = getToastsProvider();

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
/**
 * Store used to synchronize / manage the shared state and actions
 * required to interact with the "active" node configuration (displayed on the right panel).
 * It will provide the necessary functionality needed to make specific operations, such as
 * reading the dirty state, the published config data and applying settings
 */
export type UIExtensionPushEventDispatcher = Parameters<
  UIExtensionAPILayer["registerPushEventService"]
>[0]["dispatchPushEvent"];

export interface NodeConfigurationState {
  activeNodeId: string | null;
  activeExtensionConfig: ExtensionConfig | null;
  dirtyState: APILayerDirtyState;
  latestPublishedData: {
    data: unknown;
    projectId: string;
    workflowId: string;
    nodeId: string;
    versionId?: string;
  } | null;
  pushEventDispatcher: UIExtensionPushEventDispatcher;
  timestamp: number | null;
  isLargeMode: boolean;
}

export const useNodeConfigurationStore = defineStore("nodeConfiguration", {
  state: (): NodeConfigurationState => ({
    activeNodeId: null,
    activeExtensionConfig: null,
    dirtyState: {
      apply: "clean",
      view: "clean",
    },
    latestPublishedData: null,
    pushEventDispatcher: () => {},
    timestamp: null,
    isLargeMode: false,
  }),
  actions: {
    setIsLargeMode(value: boolean) {
      this.isLargeMode = value;
    },

    setActiveNodeId(activeNodeId: string | null) {
      this.activeNodeId = activeNodeId;
    },

    setPushEventDispatcher(
      pushEventDispatcher: UIExtensionPushEventDispatcher,
    ) {
      this.pushEventDispatcher = pushEventDispatcher;
    },

    setDirtyState(dirtyState: APILayerDirtyState) {
      this.dirtyState = { ...dirtyState };
    },

    setLatestPublishedData(
      latestPublishedData: NodeConfigurationState["latestPublishedData"],
    ) {
      this.latestPublishedData = latestPublishedData;
    },

    setActiveExtensionConfig(
      activeExtensionConfig: NodeConfigurationState["activeExtensionConfig"],
    ) {
      this.activeExtensionConfig = activeExtensionConfig;
    },

    updateTimestamp() {
      this.timestamp = Date.now();
    },
    /**
     * Attempts to apply the changes to the node config of the given node (by id), and optionally
     * execute the node afterwards.
     */
    async applySettings({
      nodeId,
      execute,
    }: {
      nodeId: string;
      execute?: boolean;
    }) {
      const dispatchApplySettings = () => {
        this.pushEventDispatcher({
          eventType:
            "ApplyDataEvent" satisfies UIExtensionPushEvents.KnownEventType,
        });

        // Return a promise that will resolve once the configuration
        // changes have been applied (when `setApplyComplete` is called)
        return unwrappedPromise.promise;
      };
      const isApplied = await dispatchApplySettings();

      if (isApplied && execute) {
        await useExecutionStore().executeNodes([nodeId]);
      }

      return isApplied;
    },

    async autoApplySettings({ nextNodeId }: { nextNodeId: string | null }) {
      const activeNode = this.activeNode;

      if (!activeNode) {
        return true;
      }

      if (this.dirtyState.apply === "clean") {
        return true;
      }

      const canContinue = await runInEnvironment({
        DESKTOP: async () => {
          const modalResult = await promptApplyConfirmation(
            useApplicationStore().askToConfirmNodeConfigChanges,
          );

          // if user cancelled then re-select the same node
          if (modalResult === "cancel") {
            useSelectionStore().deselectAllObjects();
            useSelectionStore().selectNode(activeNode.id);

            return false;
          }

          if (modalResult === "apply") {
            const isApplied = await this.applySettings({
              nodeId: activeNode.id,
            });

            if (!isApplied) {
              $toast.show({
                headline: "Failed to apply settings",
                message:
                  "The configured settings were invalid, so the changes have been discarded.",
                autoRemove: true,
                type: "error",
              });
              this.discardSettings();
            }
          } else {
            this.discardSettings();
          }

          this.setActiveNodeId(nextNodeId ?? null);

          return true;
        },

        BROWSER: () => {
          if (activeNode) {
            this.applySettings({ nodeId: activeNode.id });
          }

          this.setActiveNodeId(nextNodeId ?? null);
          return Promise.resolve(true);
        },
      });

      return canContinue;
    },

    /**
     * Sets the result of the latest `applySettings` action call. Calling `setApplyComplete`
     * will essentially resolve the promise returned by `dispatchApplySettings`
     */
    setApplyComplete(isApplied: boolean) {
      unwrappedPromise.resolve(isApplied);
      unwrappedPromise = createUnwrappedPromise();
    },

    /**
     * Discard the changes made to the node configuration by resetting the dirty state back to CLEAN
     */
    discardSettings() {
      this.setDirtyState({
        apply: "clean",
        view: "clean",
      });
    },

    resetDirtyState() {
      this.discardSettings();
    },
  },
  getters: {
    activeNode: (state): NativeNode | null => {
      const { activeNodeId } = state;

      if (!activeNodeId) {
        return null;
      }

      const node = useWorkflowStore().activeWorkflow?.nodes?.[activeNodeId];
      return node &&
        isNativeNode(node) &&
        node.dialogType === Node.DialogTypeEnum.Web
        ? node
        : null;
    },

    isConfigurationDisabled() {
      const isWritable = useWorkflowStore().isWritable;

      if (!isWritable) {
        return true;
      }

      const activeNode: NativeNode | null = this.activeNode;
      const { canConfigureNodes } = useUIControlsStore();
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

    canBeEnlarged(state) {
      return state.activeExtensionConfig?.canBeEnlarged ?? false;
    },
  },
});
