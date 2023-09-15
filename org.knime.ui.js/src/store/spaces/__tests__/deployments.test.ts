import { afterEach, describe, expect, it, vi } from "vitest";
import { deepMocked } from "@/test/utils";

import { API } from "@api";

import {
  loadStore,
  listJobsForWorkflowResponse,
  listSchedulesForWorkflowResponse,
} from "./loadStore";

const mockedAPI = deepMocked(API);

describe("spaces::deployments", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("deployments", () => {
    it("should fetch jobs", async () => {
      const itemId = ["id1"];
      const { store } = loadStore();

      const projectId = "project2";
      store.state.spaces.projectPath[projectId] = {
        spaceProviderId: "server",
        spaceId: "local",
        itemId: "level2",
      };

      await store.dispatch("spaces/fetchJobs", {
        projectId,
        itemId,
      });

      expect(mockedAPI.space.listJobsForWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        itemId,
      });
      expect(store.state.spaces.jobs).toEqual(listJobsForWorkflowResponse);
    });

    it("should fetch schedules", async () => {
      const itemId = ["id1"];
      const { store } = loadStore();

      const projectId = "project2";
      store.state.spaces.projectPath[projectId] = {
        spaceProviderId: "server",
        spaceId: "local",
        itemId: "level2",
      };

      await store.dispatch("spaces/fetchSchedules", {
        projectId,
        itemId,
      });

      expect(mockedAPI.space.listSchedulesForWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        itemId,
      });
      expect(store.state.spaces.schedules).toEqual(
        listSchedulesForWorkflowResponse,
      );
    });

    it("should display deployments", async () => {
      const itemId = ["id1"];
      const itemName = "Item name";
      const { store } = loadStore();

      const projectId = "project2";
      store.state.spaces.projectPath[projectId] = {
        spaceProviderId: "server",
        spaceId: "local",
        itemId: "level2",
      };

      await store.dispatch("spaces/displayDeployments", {
        projectId,
        itemId,
        itemName,
      });

      expect(store.state.spaces.jobs).toEqual(listJobsForWorkflowResponse);
      expect(store.state.spaces.schedules).toEqual(
        listSchedulesForWorkflowResponse,
      );
      expect(store.state.spaces.deploymentsModalConfig).toEqual({
        isOpen: true,
        name: itemName,
        itemId,
        projectId,
      });
    });

    it.skip("should delete job and fetch schedules if job was created by a schedule", async () => {
      const itemId = ["id1"];
      const itemName = "Item name";
      const jobId = "job1";
      const schedulerId = "scheduler1";
      const { store } = loadStore();

      const projectId = "project2";
      store.state.spaces.projectPath[projectId] = {
        spaceProviderId: "server",
        spaceId: "local",
        itemId: "level2",
      };

      await store.dispatch("spaces/displayDeployments", {
        projectId,
        itemId,
        itemName,
      });

      await store.dispatch("spaces/deleteJob", { jobId, schedulerId });
      expect(mockedAPI.space.deleteJobsForWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        jobId,
      });
      expect(mockedAPI.space.listJobsForWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        itemId,
      });
      expect(mockedAPI.space.listSchedulesForWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        itemId,
      });
    });

    it.skip("should delete job and fetch only jobs", async () => {
      const itemId = ["id1"];
      const itemName = "Item name";
      const jobId = "job1";
      const schedulerId = null;
      const { store } = loadStore();

      const projectId = "project2";
      store.state.spaces.projectPath[projectId] = {
        spaceProviderId: "server",
        spaceId: "local",
        itemId: "level2",
      };

      await store.dispatch("spaces/displayDeployments", {
        projectId,
        itemId,
        itemName,
      });

      await store.dispatch("spaces/deleteJob", { jobId, schedulerId });
      expect(mockedAPI.space.deleteJobsForWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        jobId,
      });
      expect(mockedAPI.space.listJobsForWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        itemId,
      });
      expect(mockedAPI.space.listSchedulesForWorkflow).not.toHaveBeenCalledWith(
        {
          spaceId: "local",
          spaceProviderId: "server",
          itemId,
        },
      );
    });

    it.skip("should save job as a workflow", async () => {
      const itemId = ["id1"];
      const itemName = "Item name";
      const jobId = "job1";
      const { store } = loadStore();

      const projectId = "project2";
      store.state.spaces.projectPath[projectId] = {
        spaceProviderId: "server",
        spaceId: "local",
        itemId: "level2",
      };

      await store.dispatch("spaces/displayDeployments", {
        projectId,
        itemId,
        itemName,
      });
      store.dispatch("spaces/saveJobAsWorkflow", { jobId });

      expect(mockedAPI.space.saveJobAsWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        itemId,
      });
    });
  });
});
