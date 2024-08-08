import { isBrowser, isDesktop } from "@/environment";
import type { ActionTree, MutationTree } from "vuex";
import type { RootStoreState } from "../types";

/** *******************************************************************
 *                         A NOTE ON MODES
 *
 * DEFAULT: refers to the mode where the user is in full control of
 * the Analytics Platform (AP), edit-wise, irrespective of the environment
 * it is running in (desktop / browser)
 *
 * JOB_VIEWER: This mode exists only in the browser environment.
 * It refers to the feature of the same name where the user can
 * inspect the workflow of a job (in the hub), potentially for
 * debugging reasons or in to inspect the output in general. It is
 * a **readonly** mode
 *
 * PLAYGROUND: This mode exists only in the browser environment.
 * It refers to the feature of the same name where a user can access
 * an AP instance in the browser with limited features (selected by KNIME)
 * and with full edit support; but no persistence: meaning the user's
 * modifications to the workflow won't be saved anywhere
 ********************************************************************** */

export interface UIControlsState {
  /**
   * Whether to render the K-AI sidebar panel
   */
  canAccessKAIPanel: boolean;
  /**
   * Whether to render the node repository sidebar panel
   */
  canAccessNodeRepository: boolean;
  /**
   * Whether to render the space explorer sidebar panel
   */
  canAccessSpaceExplorer: boolean;
  /**
   * Whether user is open nodes' configuration
   */
  canConfigureNodes: boolean;
  /**
   * Whether user is allowed to mutate the workflow in any way (e.g move nodes, create annotations, etc)
   */
  canEditWorkflow: boolean;
  /**
   * Whether to display the remote workflow info bar at all (even in the case of a workflow with unknown origin)
   */
  shouldDisplayRemoteWorkflowInfoBar: boolean;
  /**
   * Whether to show the button that allows the user to download the AP
   */
  shouldDisplayDownloadAPButton: boolean;
  /**
   * Whether flow variables can be configured via their *legacy* dialog
   */
  canConfigureFlowVariables: boolean;
  /**
   * Whether component operations related to sharing (aka linking) are allowed
   */
  canDoComponentSharingOperations: boolean;
  /**
   * Whether detaching *port* views is allowed (open in a new window)
   */
  canDetachPortViews: boolean;
  /**
   * Whether detaching *node* views is allowed (open in a new window)
   */
  canDetachNodeViews: boolean;

  isLocalSaveSupported: boolean;
  /**
   * Whether opening the *legacy* dialog for port views is allowed
   */
  canOpenLegacyPortViews: boolean;
  /**
   * Whether locking of metanodes and/or components is allowed
   */
  canLockAndUnlockSubnodes: boolean;

  canOpenComponentLayoutEditor: boolean;
  /**
   * Whether K-AI is supported
   */
  // NOTE: K-AI is not supported yet the playground. This property should be removed
  // since we want K-AI to be supported everywhere, so this can be thought of as temporary
  isKAISupported: boolean;
}

export const state = (): UIControlsState => ({
  canAccessKAIPanel: false,
  isKAISupported: false,

  canAccessNodeRepository: false,
  canAccessSpaceExplorer: false,
  canConfigureNodes: false,
  canEditWorkflow: false,
  shouldDisplayRemoteWorkflowInfoBar: false,
  shouldDisplayDownloadAPButton: false,

  canConfigureFlowVariables: false,

  canDoComponentSharingOperations: false,

  canDetachPortViews: false,

  canDetachNodeViews: false,

  isLocalSaveSupported: false,

  canOpenLegacyPortViews: false,

  canLockAndUnlockSubnodes: false,

  canOpenComponentLayoutEditor: false,
});

export const mutations: MutationTree<UIControlsState> = {
  updateControls(state, value: UIControlsState) {
    Object.entries(value).forEach(([key, value]) => {
      state[key] = value;
    });
  },
};

export const actions: ActionTree<UIControlsState, RootStoreState> = {
  init({ commit, rootState }) {
    const mode = rootState.application.mode;
    const isDefault = mode === "default";
    const isPlayground = mode === "playground";

    const { analyticsPlatformDownloadURL } = rootState.application;

    const uiControls: UIControlsState = {
      canAccessKAIPanel: isDefault || isPlayground,
      canAccessNodeRepository: isDefault || isPlayground,
      canAccessSpaceExplorer: isDesktop,
      canConfigureNodes: isDefault || isPlayground,
      canEditWorkflow: isDefault || isPlayground,
      shouldDisplayRemoteWorkflowInfoBar: isDesktop,
      shouldDisplayDownloadAPButton:
        isBrowser && isPlayground && Boolean(analyticsPlatformDownloadURL),
      isKAISupported: isDesktop || (isBrowser && isDefault),

      /**
       * The following properties reference features that are
       * (for the time being) only supported in desktop AP.
       */
      canConfigureFlowVariables: isDesktop,
      canDoComponentSharingOperations: isDesktop,
      canDetachPortViews: isDesktop,
      canDetachNodeViews: isDesktop,
      isLocalSaveSupported: isDesktop,
      canOpenLegacyPortViews: isDesktop,
      canLockAndUnlockSubnodes: isDesktop,
      canOpenComponentLayoutEditor: isDesktop,
    };

    commit("updateControls", uiControls);
  },
};
