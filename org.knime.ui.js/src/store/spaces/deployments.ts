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
  async fetchJobs({ state, commit }, { projectId, itemId }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    const jobs = await API.space.listJobsForWorkflow({
      spaceId,
      spaceProviderId,
      itemId,
    });

    commit("setJobs", jobs);
  },

  async fetchSchedules({ state, commit }, { projectId, itemId }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    const schedules = await API.space.listSchedulesForWorkflow({
      spaceId,
      spaceProviderId,
      itemId,
    });

    commit("setSchedules", schedules);
  },

  displayDeployments({ commit, dispatch }, { projectId, itemId, itemName }) {
    dispatch("fetchJobs", { projectId, itemId });
    dispatch("fetchSchedules", { projectId, itemId });
    commit("setDeploymentsModalConfig", {
      isOpen: true,
      name: itemName,
      projectId,
      itemId,
    });
  },

  async deleteJob({ state, dispatch }, { jobId, schedulerId }) {
    const projectId = state.deploymentsModalConfig.projectId;
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    const itemId = state.deploymentsModalConfig.itemId;

    await API.space.deleteJobsForWorkflow(
      spaceId,
      spaceProviderId,
      itemId,
      jobId,
    );
    // console.log("deleted job:", jobId);

    dispatch("fetchJobs", { projectId, itemId });
    if (schedulerId) {
      dispatch("fetchSchedules", { projectId, itemId });
    }
  },

  saveJobAsWorkflow({ state }, { jobId }) {
    const projectId = state.deploymentsModalConfig.projectId;
    const { spaceId, spaceProviderId } = state.projectPath[projectId];

    // console.log("saved job:", jobId);
    API.space.saveJobAsWorkflow(spaceId, spaceProviderId, jobId);
  },
};
