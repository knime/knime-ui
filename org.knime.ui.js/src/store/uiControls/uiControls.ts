import { defineStore } from "pinia";

import { AppState } from "@/api/gateway-api/generated-api";
import { isBrowser, isDesktop } from "@/environment";
import { useApplicationStore } from "@/store/application/application";

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
   * Whether user can open nodes' configuration
   */
  canConfigureNodes: boolean;
  /**
   * Whether user is allowed to mutate the workflow in any way (e.g move nodes, create annotations, etc)
   */
  canEditWorkflow: boolean;
  /**
   * Whether user can view workflow version
   */
  canViewVersions: boolean;
  /**
   * Whether to display the remote workflow info bar at all (even in the case of a workflow with unknown origin)
   */
  shouldDisplayRemoteWorkflowInfoBar: boolean;
  /**
   * Whether to show the button that allows the user to download the AP
   */
  shouldDisplayDownloadAPButton: boolean;
  /**
   * Whether to allow re-execution of composite views (enable widgets in composite views)
   */
  canReExecuteCompositeViews: boolean;
  /**
   * Whether flow variables can be configured via their *legacy* dialog
   */
  canConfigureFlowVariables: boolean;
  /**
   * Whether component operations related to sharing (aka linking) are allowed
   */
  canDoComponentSharingOperations: boolean;
  /**
   * Whether component operations like change link and change hub version are allowed
   */
  canDoAdvancedComponentSharingOperations: boolean;
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

  canOpenLayoutEditor: boolean;
  /**
   * Whether K-AI is supported
   */
  // NOTE: K-AI is not supported yet the playground. This property should be removed
  // since we want K-AI to be supported everywhere, so this can be thought of as temporary
  isKAISupported: boolean;
}

export const useUIControlsStore = defineStore("uiControls", {
  state: (): UIControlsState => ({
    canAccessKAIPanel: false,
    isKAISupported: false,

    canAccessNodeRepository: false,
    canAccessSpaceExplorer: false,
    canConfigureNodes: false,
    canEditWorkflow: false,
    canViewVersions: false,
    shouldDisplayRemoteWorkflowInfoBar: false,
    shouldDisplayDownloadAPButton: false,
    canReExecuteCompositeViews: false,

    canConfigureFlowVariables: false,

    canDoComponentSharingOperations: false,
    canDoAdvancedComponentSharingOperations: false,

    canDetachPortViews: false,

    canDetachNodeViews: false,

    isLocalSaveSupported: false,

    canOpenLegacyPortViews: false,

    canLockAndUnlockSubnodes: false,

    canOpenLayoutEditor: false,
  }),
  actions: {
    updateControls(value: UIControlsState) {
      Object.entries(value).forEach(([key, value]) => {
        this[key] = value;
      });
    },

    init() {
      const appMode = useApplicationStore().appMode;
      const isDefault = appMode === AppState.AppModeEnum.Default;
      const isPlayground = appMode === AppState.AppModeEnum.Playground;

      const uiControls: UIControlsState = {
        canAccessKAIPanel: isDefault || isPlayground,
        canAccessNodeRepository: isDefault || isPlayground,
        canAccessSpaceExplorer: isDefault,
        canConfigureNodes: isDefault || isPlayground,
        canEditWorkflow: isDefault || isPlayground,
        canViewVersions: isDefault,
        shouldDisplayRemoteWorkflowInfoBar: isDesktop(),
        shouldDisplayDownloadAPButton:
          isBrowser() &&
          isPlayground &&
          Boolean(useApplicationStore().analyticsPlatformDownloadURL),
        isKAISupported: isDesktop() || (isBrowser() && isDefault),
        canReExecuteCompositeViews: isDefault || isPlayground,

        /**
         * The following properties reference features that are
         * (for the time being) only supported in desktop AP.
         */
        canConfigureFlowVariables: isDesktop(),
        canDoAdvancedComponentSharingOperations: isDesktop(),
        canDetachPortViews: isDesktop(),
        canDetachNodeViews: isDesktop(),
        isLocalSaveSupported: isDesktop(),
        canOpenLegacyPortViews: isDesktop(),
        canLockAndUnlockSubnodes: isDesktop(),

        canDoComponentSharingOperations:
          isDesktop() || (isBrowser() && isDefault),
        canOpenLayoutEditor: isDesktop() || (isBrowser() && isDefault),
      };

      this.updateControls(uiControls);
    },
  },
});
