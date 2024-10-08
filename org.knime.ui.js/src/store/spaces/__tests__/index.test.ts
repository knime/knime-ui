import { describe, expect, it } from "vitest";

import { API } from "@/api";
import { deepMocked } from "@/test/utils";

import { loadStore } from "./loadStore";

const mockedAPI = deepMocked(API);

describe("spaces::index", () => {
  describe("copyBetweenSpace", () => {
    it("should copy items between spaces", async () => {
      const itemIds = ["id1", "id2"];
      const { store } = loadStore();

      const projectId = "project2";
      store.state.spaces.projectPath[projectId] = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };

      await store.dispatch("spaces/copyBetweenSpaces", {
        projectId,
        itemIds,
      });
      expect(mockedAPI.desktop.copyBetweenSpaces).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "local",
        itemIds,
      });
    });
  });

  describe("moveOrCopyToSpace", () => {
    it("should move items between spaces on same Hub", async () => {
      const itemIds = ["id1", "id2"];
      mockedAPI.desktop.moveOrCopyToSpace.mockReturnValueOnce(true);
      const { store, dispatchSpy } = loadStore();

      const projectId = "project2";
      store.state.spaces.projectPath[projectId] = {
        spaceProviderId: "hub1",
        spaceId: "space1",
        itemId: "level2",
      };

      await store.dispatch("spaces/moveOrCopyToSpace", {
        projectId,
        isCopy: false,
        itemIds,
      });
      expect(mockedAPI.desktop.moveOrCopyToSpace).toHaveBeenCalledWith({
        spaceId: "space1",
        spaceProviderId: "hub1",
        isCopy: false,
        itemIds,
      });
      expect(dispatchSpy).toHaveBeenCalledWith(
        "spaces/fetchWorkflowGroupContent",
        { projectId },
      );
    });
  });
});
