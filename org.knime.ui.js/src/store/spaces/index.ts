import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";

import * as auth from "./auth";
import * as caching from "./caching";
import * as providers from "./providers";
import * as spaceOperations from "./spaceOperations";
import type { RootStoreState } from "../types";

interface CreateWorkflowModalConfig {
  isOpen: boolean;
  projectId: string;
}

export * from "./common";
export * from "./types";

export interface SpacesState {
  createWorkflowModalConfig: CreateWorkflowModalConfig;
}

export const state = (): SpacesState => ({
  ...auth.state(),
  ...caching.state(),
  ...providers.state(),
  ...spaceOperations.state(),

  // modal open state
  createWorkflowModalConfig: {
    isOpen: false,
    projectId: null,
  },
});

export const mutations: MutationTree<SpacesState> = {
  ...auth.mutations,
  ...caching.mutations,
  ...providers.mutations,
  ...spaceOperations.mutations,

  setCreateWorkflowModalConfig(state, value: CreateWorkflowModalConfig) {
    state.createWorkflowModalConfig = value;
  },
};

export const actions: ActionTree<SpacesState, RootStoreState> = {
  ...auth.actions,
  ...caching.actions,
  ...providers.actions,
  ...spaceOperations.actions,

  copyBetweenSpaces({ state }, { projectId, itemIds }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    API.desktop.copyBetweenSpaces({ spaceProviderId, spaceId, itemIds });
  },

  openInHub({ state }, { projectId, itemId }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    API.desktop.openInHub({ spaceProviderId, spaceId, itemId });
  },

  // TODO: Is this the right place to put this function?
  openPermissionsDialog({ state }, { projectId, itemId }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    API.desktop.openPermissionsDialog({ spaceProviderId, spaceId, itemId });
  }
};

export const getters: GetterTree<SpacesState, RootStoreState> = {
  ...auth.getters,
  ...caching.getters,
  ...providers.getters,
  ...spaceOperations.getters,
};
