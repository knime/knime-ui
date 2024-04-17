import type { ActionTree, MutationTree } from "vuex";

import type { Permissions } from "@/api/gateway-api/generated-api";
import type { RootStoreState } from "../types";
import type { ApplicationState } from "./index";

interface State {
  /**
   * Permissions granted to the current user's session, which allow/disallow
   * usage of certain UI features
   */
  permissions: Permissions;
}

declare module "./index" {
  interface ApplicationState extends State {}
}

export const state = (): State => ({
  permissions: {
    canConfigureNodes: true,
    canEditWorkflow: true,
    canAccessNodeRepository: true,
    canAccessKAIPanel: true,
    canAccessSpaceExplorer: true,
    showRemoteWorkflowInfo: true,
    showFloatingDownloadButton: false,
  },
});

export const mutations: MutationTree<ApplicationState> = {
  setPermissions(state, value: Permissions) {
    state.permissions = {
      ...value,
      showFloatingDownloadButton:
        value.showFloatingDownloadButton &&
        Boolean(state.analyticsPlatformDownloadURL),
    };
  },
};

export const actions: ActionTree<ApplicationState, RootStoreState> = {};
