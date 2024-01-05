import type { ActionTree, MutationTree } from "vuex";

import type { RootStoreState } from "../types";
import type { ApplicationState } from "./index";

interface Permissions {
  canConfigureNodes: boolean;
  canEditWorkflow: boolean;
  canAccessNodeRepository: boolean;
  canAccessKAIPanel: boolean;
  canAccessSpaceExplorer: boolean;
}

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
  },
});

export const mutations: MutationTree<ApplicationState> = {
  setPermissions(state, value: Permissions) {
    state.permissions = value;
  },
};

export const actions: ActionTree<ApplicationState, RootStoreState> = {};
