import { API } from "@api";
import { defineStore } from "pinia";

import type {
  APILayerDirtyState,
  KnownEventType,
} from "@knime/ui-extension-renderer/api";
import type { UIExtensionAPILayer } from "@knime/ui-extension-renderer/vue";
import { promise } from "@knime/utils";

import {
  type ComponentNode,
  type MetaNode,
  type NativeNode,
  Node,
  NodeState,
} from "@/api/gateway-api/generated-api";
import type { ExtensionConfig } from "@/components/uiExtensions/common/types";
import {
  UnsavedChangesAction,
  useUnsavedChangesDialog,
} from "@/composables/confirmDialogs/useUnsavedChangesDialog";
import { runInEnvironment } from "@/environment";
import { getToastsProvider } from "@/plugins/toasts";
import { useApplicationStore } from "@/store/application/application";
import { useSelectionStore } from "@/store/selection";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useExecutionStore } from "@/store/workflow/execution";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { workflowDomain } from "@/util/workflow-domain";

let unwrappedPromise = promise.createUnwrappedPromise<boolean>();
const $toast = getToastsProvider();

const showUnsavedChangesDialog = async (askToConfirm: boolean) => {
  if (!askToConfirm) {
    return UnsavedChangesAction.SAVE;
  }

  const { action, doNotAskAgain } = await useUnsavedChangesDialog({
    title: "Unsaved configuration changes",
    message:
      "You have unsaved changes in your node configuration. Do you want to save them?",
    doNotAskAgain: {
      label: "Always save and do not ask again.",
      helperText: "(You can still change this in the preferences)",
    },
  });

  // box was checked and setting is set to "ask"
  if (doNotAskAgain && askToConfirm) {
    await API.desktop.setConfirmNodeConfigChangesPreference(false);
  }

  return action;
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
  isLargeMode: boolean;
  activeNodeViewNeedsExecution: boolean;
}

type ActiveContext =
  | { node: NativeNode | ComponentNode; isEmbeddable: boolean }
  | { node: MetaNode; isEmbeddable: false }
  | null;

export const useNodeConfigurationStore = defineStore("nodeConfiguration", {
  state: (): NodeConfigurationState => ({
    activeExtensionConfig: null,
    dirtyState: {
      apply: "clean",
      view: "clean",
    },
    latestPublishedData: null,
    pushEventDispatcher: () => {},
    isLargeMode: false,
    activeNodeViewNeedsExecution: false,
  }),
  actions: {
    setIsLargeMode(value: boolean) {
      this.isLargeMode = value;

      if (!this.pushEventDispatcher) {
        consola.warn(
          "Tried to toggle large mode but push event dispached is not available",
        );
        return;
      }

      this.pushEventDispatcher({
        eventType: "DisplayModeEvent" satisfies KnownEventType,
        payload: { mode: this.isLargeMode ? "large" : "small" },
      });
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
          eventType: "ApplyDataEvent" satisfies KnownEventType,
        });

        // Return a promise that will resolve once the configuration
        // changes have been applied (when `setApplyComplete` is called)
        return unwrappedPromise.promise;
      };

      // when applying settings, if this node's view needs execution then
      // we set this flag to stop the view from rendering until the changes
      // from the backend are applied (node state changes, etc)
      if (this.dirtyState.view === "configured") {
        this.activeNodeViewNeedsExecution = true;
      }

      const isApplied = await dispatchApplySettings();

      if (isApplied && execute) {
        await useExecutionStore().executeNodes([nodeId]);
      }

      return isApplied;
    },

    async autoApplySettings() {
      const { activeContext } = useNodeConfigurationStore();

      if (!activeContext) {
        return true;
      }

      if (this.dirtyState.apply === "clean") {
        return true;
      }

      const canContinue = await runInEnvironment({
        DESKTOP: async () => {
          const modalResult = await showUnsavedChangesDialog(
            useApplicationStore().askToConfirmNodeConfigChanges,
          );

          if (modalResult === UnsavedChangesAction.CANCEL) {
            return false;
          }

          if (modalResult === UnsavedChangesAction.SAVE) {
            const isApplied = await this.applySettings({
              nodeId: activeContext.node.id,
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
          return true;
        },

        BROWSER: async () => {
          if (activeContext) {
            await this.applySettings({ nodeId: activeContext.node.id });
          }

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
      unwrappedPromise = promise.createUnwrappedPromise();
    },

    /**
     * Discard the changes made to the node configuration by resetting the dirty state back to CLEAN
     */
    discardSettings() {
      this.setLatestPublishedData(null);
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
    isDirty: (state) => {
      return (
        state.dirtyState.apply !== "clean" || state.dirtyState.view !== "clean"
      );
    },

    activeContext: (_): ActiveContext => {
      const { querySelection } = useSelectionStore();
      const { singleSelectedNode } = querySelection("committed");
      const activeNodeId = singleSelectedNode.value?.id;

      if (!activeNodeId) {
        return null;
      }

      const node = useWorkflowStore().activeWorkflow?.nodes?.[activeNodeId];

      if (!node) {
        return null;
      }

      if (workflowDomain.node.isMetaNode(node)) {
        return { node, isEmbeddable: false };
      }

      return {
        node,
        isEmbeddable: node.dialogType === Node.DialogTypeEnum.Web,
      };
    },

    isConfigurationDisabled() {
      const isWritable = useWorkflowStore().isWritable;

      if (!isWritable || !this.activeContext) {
        return true;
      }

      const { node: activeNode } = this
        .activeContext as NonNullable<ActiveContext>;

      const { canConfigureNodes } = useUIControlsStore();
      const isActiveNodeExecuting = workflowDomain.node.isExecuting(activeNode);

      if (
        isActiveNodeExecuting ||
        !canConfigureNodes ||
        !this.activeContext.isEmbeddable ||
        !this.activeContext
      ) {
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
