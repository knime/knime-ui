import { API } from "@api";
import { defineStore } from "pinia";

import type { Job, Schedule } from "@/api/custom-types";

import { useSpaceCachingStore } from "./caching";
import { useSpaceOperationsStore } from "./spaceOperations";
import { useSpacesStore } from "./spaces";

type DeploymentsState = {
  jobs: Job[];
  schedules: Schedule[];
};

export const useDeploymentsStore = defineStore("deployments", {
  state: (): DeploymentsState => ({
    jobs: [],
    schedules: [],
  }),
  actions: {
    setJobs(jobs: Job[]) {
      this.jobs = jobs;
    },

    setSchedules(schedules: Schedule[]) {
      this.schedules = schedules;
    },

    async fetchJobs({
      projectId,
      itemId,
    }: {
      projectId: string;
      itemId: string;
    }) {
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];
      const jobs = await API.space.listJobsForWorkflow({
        spaceId,
        spaceProviderId,
        itemId,
      });

      this.setJobs(jobs);
    },

    async fetchSchedules({
      projectId,
      itemId,
    }: {
      projectId: string;
      itemId: string;
    }) {
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];
      const schedules = await API.space.listSchedulesForWorkflow({
        spaceId,
        spaceProviderId,
        itemId,
      });

      this.setSchedules(schedules);
    },

    displayDeployments({
      projectId,
      itemId,
      itemName,
    }: {
      projectId: string;
      itemId: string;
      itemName: string;
    }) {
      this.fetchJobs({ projectId, itemId });
      this.fetchSchedules({ projectId, itemId });
      useSpacesStore().setDeploymentsModalConfig({
        isOpen: true,
        name: itemName,
        projectId,
        itemId,
      });
    },

    async deleteJob({
      jobId,
      schedulerId,
    }: {
      jobId: string;
      schedulerId: string;
    }) {
      const { projectId, itemId } = useSpacesStore().deploymentsModalConfig;
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];

      await API.space.deleteJobsForWorkflow({
        spaceId,
        spaceProviderId,
        itemId,
        jobId,
      });

      await this.fetchJobs({ projectId, itemId });

      if (schedulerId) {
        await this.fetchSchedules({ projectId, itemId });
      }
    },

    async saveJobAsWorkflow({
      jobId,
      jobName,
    }: {
      jobId: string;
      jobName: string;
    }) {
      const { projectId, itemId } = useSpacesStore().deploymentsModalConfig;
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];

      const savedWFId = await API.desktop.saveJobAsWorkflow({
        spaceProviderId,
        spaceId,
        itemId,
        jobId,
        jobName,
      });

      if (savedWFId) {
        await useSpaceOperationsStore().fetchWorkflowGroupContent({
          projectId,
        });
        useSpacesStore().setDeploymentsModalConfig({
          isOpen: false,
          name: "",
          projectId: "",
          itemId: "",
        });
      }
    },

    async editSchedule({ scheduleId }: { scheduleId: string }) {
      const { projectId, itemId } = useSpacesStore().deploymentsModalConfig;
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];

      const updatedScheduleId = await API.desktop.editSchedule({
        spaceProviderId,
        spaceId,
        itemId,
        scheduleId,
      });

      if (updatedScheduleId) {
        await this.fetchSchedules({ projectId, itemId });
      }
    },

    async deleteSchedule({ scheduleId }: { scheduleId: string }) {
      const { projectId, itemId } = useSpacesStore().deploymentsModalConfig;
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];

      await API.space.deleteSchedulesForWorkflow({
        spaceId,
        spaceProviderId,
        itemId,
        scheduleId,
      });

      await this.fetchSchedules({ projectId, itemId });
    },

    executeWorkflow({
      projectId,
      itemId,
    }: {
      projectId: string;
      itemId: string;
    }) {
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];

      API.desktop.executeWorkflow({
        spaceId,
        spaceProviderId,
        itemId,
      });
    },
  },
});
