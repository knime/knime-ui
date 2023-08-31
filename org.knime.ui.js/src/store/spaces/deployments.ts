import type { MutationTree, ActionTree } from "vuex";

import { API } from "@api";
import type { Job, Schedule } from "@/api/custom-types";

import type { RootStoreState } from "../types";
import type { SpacesState } from "./index";

interface State {
  jobs: Job[];
  schedules: Schedule[];
}

declare module "./index" {
  interface SpacesState extends State {}
}

export const state = (): State => ({
  jobs: [],
  schedules: [],
});

export const mutations: MutationTree<SpacesState> = {
  setJobs(state, value) {
    state.jobs = value;
  },

  setSchedules(state, value) {
    state.schedules = value;
  },
};

export const actions: ActionTree<SpacesState, RootStoreState> = {
  async displayDeployments({ state, commit }, { projectId, itemId, itemName }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];

    const jobs = await API.space.listJobsForWorkflow({
      spaceId,
      spaceProviderId,
      itemId,
    });
    const schedules = await API.space.listSchedulesForWorkflow({
      spaceId,
      spaceProviderId,
      itemId,
    });

    commit("setJobs", jobs);
    commit("setSchedules", schedules);
    commit("setDeploymentsModalConfig", { isOpen: true, name: itemName });
  },
};
