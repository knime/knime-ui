import type { MutationTree, ActionTree } from "vuex";

import { API } from "@api";

import type { RootStoreState } from "../types";
import type { SpacesState } from "./index";

interface State {
  jobs: any;
  schedules: any;
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
    console.log("schedules", schedules);
    console.log("jobs", jobs);

    commit("setJobs", jobs);
    commit("setSchedules", schedules);
    commit("setDisplayDeploymentsModal", { isOpen: true, name: itemName });
  },
};
