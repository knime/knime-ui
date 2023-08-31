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

  describe("display deployments", () => {
    it("should fetch jobs and schedules", async () => {
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
      expect(store.state.spaces.jobs).toEqual(listJobsForWorkflowResponse);
      expect(store.state.spaces.schedules).toEqual(
        listSchedulesForWorkflowResponse,
      );
      expect(store.state.spaces.deploymentsModalConfig).toEqual({
        isOpen: true,
        name: itemName,
      });
    });
  });
});
