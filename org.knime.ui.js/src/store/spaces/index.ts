import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";

import * as auth from "./auth";
import * as caching from "./caching";
import * as providers from "./providers";
import * as spaceOperations from "./spaceOperations";
import * as deployments from "./deployments";
import type { RootStoreState } from "../types";

interface CreateWorkflowModalConfig {
  isOpen: boolean;
  projectId: string;
}

interface DeploymentsModalConfig {
  isOpen: boolean;
  name: string;
}

export * from "./common";
export * from "./types";

export interface SpacesState {
  createWorkflowModalConfig: CreateWorkflowModalConfig;
  deploymentsModalConfig: DeploymentsModalConfig;
}

export const state = (): SpacesState => ({
  ...auth.state(),
  ...caching.state(),
  ...providers.state(),
  ...spaceOperations.state(),
  ...deployments.state(),

  // modal open state
  createWorkflowModalConfig: {
    isOpen: false,
    projectId: null,
  },
  deploymentsModalConfig: {
    isOpen: false,
    name: null,
  },
});

export const mutations: MutationTree<SpacesState> = {
  ...auth.mutations,
  ...caching.mutations,
  ...providers.mutations,
  ...spaceOperations.mutations,
  ...deployments.mutations,

  setCreateWorkflowModalConfig(state, value: CreateWorkflowModalConfig) {
    state.createWorkflowModalConfig = value;
  },

  setDeploymentsModalConfig(state, value: DeploymentsModalConfig) {
    state.deploymentsModalConfig = value;
  },
};

export const actions: ActionTree<SpacesState, RootStoreState> = {
  ...auth.actions,
  ...caching.actions,
  ...providers.actions,
  ...spaceOperations.actions,
  ...deployments.actions,

  copyBetweenSpaces({ state }, { projectId, itemIds }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    API.desktop.copyBetweenSpaces({ spaceProviderId, spaceId, itemIds });
  },

  openInBrowser({ state }, { projectId, itemId }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    API.desktop.openInBrowser({ spaceProviderId, spaceId, itemId });
  },

  openAPIDefinition({ state }, { projectId, itemId }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    API.desktop.openAPIDefinition({ spaceProviderId, spaceId, itemId });
  },
};

export const getters: GetterTree<SpacesState, RootStoreState> = {
  ...auth.getters,
  ...caching.getters,
  ...providers.getters,
  ...spaceOperations.getters,
};
