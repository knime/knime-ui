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

interface DisplayDeploymentsModal {
  isOpen: boolean;
  name: string;
}

export * from "./common";
export * from "./types";

export interface SpacesState {
  createWorkflowModalConfig: CreateWorkflowModalConfig;
  displayDeploymentsModal: DisplayDeploymentsModal;
  jobs: any;
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
  displayDeploymentsModal: {
    isOpen: false,
    name: null,
  },
  jobs: [],
});

export const mutations: MutationTree<SpacesState> = {
  ...auth.mutations,
  ...caching.mutations,
  ...providers.mutations,
  ...spaceOperations.mutations,

  setCreateWorkflowModalConfig(state, value: CreateWorkflowModalConfig) {
    state.createWorkflowModalConfig = value;
  },

  setDisplayDeploymentsModal(state, value: DisplayDeploymentsModal) {
    state.displayDeploymentsModal = value;
  },

  setJobs(state, value) {
    state.jobs = value;
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

  openInBrowser({ state }, { projectId, itemId }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    API.desktop.openInBrowser({ spaceProviderId, spaceId, itemId });
  },

  openAPIDefinition({ state }, { projectId, itemId }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    API.desktop.openAPIDefinition({ spaceProviderId, spaceId, itemId });
  },

  async displayJob({ state, commit }, { projectId, itemId, itemName }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];

    const jobs = await API.space.listJobsForWorkflow({
      spaceId,
      spaceProviderId,
      itemId,
    });
    commit("setJobs", jobs);
    commit("setDisplayDeploymentsModal", { isOpen: true, name: itemName });
  },
};

export const getters: GetterTree<SpacesState, RootStoreState> = {
  ...auth.getters,
  ...caching.getters,
  ...providers.getters,
  ...spaceOperations.getters,
};
