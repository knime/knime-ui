import { afterEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

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
      const itemId = "mockItemId1";
      const { deploymentsStore, spaceCachingStore } = loadStore();

      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "server",
        spaceId: "local",
        itemId: "level2",
      };

      await deploymentsStore.fetchJobs({
        projectId,
        itemId,
      });

      expect(mockedAPI.space.listJobsForWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        itemId,
      });
      expect(deploymentsStore.jobs).toEqual(listJobsForWorkflowResponse);
    });

    it("should fetch schedules", async () => {
      const itemId = "mockItemId1";
      const { deploymentsStore, spaceCachingStore } = loadStore();

      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "server",
        spaceId: "local",
        itemId: "level2",
      };

      await deploymentsStore.fetchSchedules({
        projectId,
        itemId,
      });

      expect(mockedAPI.space.listSchedulesForWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        itemId,
      });
      expect(deploymentsStore.schedules).toEqual(
        listSchedulesForWorkflowResponse,
      );
    });

    it("should display deployments", async () => {
      const itemId = "mockItemId1";
      const itemName = "Item name";
      const { deploymentsStore, spaceCachingStore, spacesStore } = loadStore();

      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "server",
        spaceId: "local",
        itemId: "level2",
      };

      await deploymentsStore.displayDeployments({
        projectId,
        itemId,
        itemName,
      });

      expect(deploymentsStore.jobs).toEqual(listJobsForWorkflowResponse);
      expect(deploymentsStore.schedules).toEqual(
        listSchedulesForWorkflowResponse,
      );
      expect(spacesStore.deploymentsModalConfig).toEqual({
        isOpen: true,
        name: itemName,
        itemId,
        projectId,
      });
    });

    it("should delete job and fetch schedules if job was created by a schedule", async () => {
      const itemId = "mockItemId1";
      const itemName = "Item name";
      const jobId = "job1";
      const schedulerId = "scheduler1";
      const { deploymentsStore, spaceCachingStore } = loadStore();

      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "server",
        spaceId: "local",
        itemId: "level2",
      };

      await deploymentsStore.displayDeployments({
        projectId,
        itemId,
        itemName,
      });

      await deploymentsStore.deleteJob({ jobId, schedulerId });
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
      const itemId = "mockItemId1";
      const itemName = "Item name";
      const jobId = "job1";
      const schedulerId = "";
      const { deploymentsStore, spaceCachingStore } = loadStore();

      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "server",
        spaceId: "local",
        itemId: "level2",
      };

      await deploymentsStore.displayDeployments({
        projectId,
        itemId,
        itemName,
      });
      expect(mockedAPI.space.listSchedulesForWorkflow).toHaveBeenCalledOnce();

      await deploymentsStore.deleteJob({ jobId, schedulerId });
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
      const itemId = "mockItemId1";
      const itemName = "Item name";
      const jobId = "job1";
      const jobName = "myjob";

      mockedAPI.desktop.saveJobAsWorkflow.mockReturnValueOnce("newWorkflowId");
      const { deploymentsStore, spaceCachingStore, spaceOperationsStore } =
        loadStore();

      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "server",
        spaceId: "local",
        itemId: "level2",
      };

      await deploymentsStore.displayDeployments({
        projectId,
        itemId,
        itemName,
      });
      await deploymentsStore.saveJobAsWorkflow({ jobId, jobName });

      expect(mockedAPI.desktop.saveJobAsWorkflow).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "server",
        itemId,
        jobId,
        jobName,
      });

      expect(
        spaceOperationsStore.fetchWorkflowGroupContent,
      ).toHaveBeenCalledWith({ projectId });
    });
  });
});
