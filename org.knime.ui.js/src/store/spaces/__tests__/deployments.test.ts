import { afterEach, describe, expect, it, vi } from "vitest";

import { API } from "@/api";
import { deepMocked } from "@/test/utils";

import {
  listJobsForWorkflowResponse,
  listSchedulesForWorkflowResponse,
  loadStore,
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

    it("should delete job and fetch schedules if job was created by a schedule", async () => {
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
        itemId,
      });
      expect(mockedAPI.space.listJobsForWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        itemId,
      });
      expect(mockedAPI.space.listSchedulesForWorkflow).toHaveBeenLastCalledWith(
        {
          spaceId: "local",
          spaceProviderId: "server",
          itemId,
        },
      );
    });

    it("should delete job and fetch only jobs", async () => {
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
      expect(mockedAPI.space.listSchedulesForWorkflow).toHaveBeenCalledOnce();

      await store.dispatch("spaces/deleteJob", { jobId, schedulerId });
      expect(mockedAPI.space.deleteJobsForWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        itemId,
        jobId,
      });
      expect(mockedAPI.space.listJobsForWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        itemId,
      });
      expect(mockedAPI.space.listSchedulesForWorkflow).toHaveBeenCalledOnce();
    });

    it("should save job as a workflow", async () => {
      const itemId = ["id1"];
      const itemName = "Item name";
      const jobId = "job1";
      const jobName = "myjob";

      mockedAPI.desktop.saveJobAsWorkflow.mockReturnValueOnce("newWorkflowId");
      const { store, dispatchSpy } = loadStore();

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
      await store.dispatch("spaces/saveJobAsWorkflow", { jobId, jobName });

      expect(mockedAPI.desktop.saveJobAsWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        itemId,
        jobId,
        jobName,
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        "spaces/fetchWorkflowGroupContent",
        { projectId },
      );
    });
  });
});
