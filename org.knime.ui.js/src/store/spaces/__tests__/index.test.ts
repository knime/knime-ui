import { describe, expect, it } from "vitest";
import { deepMocked } from "@/test/utils";
import { API } from "@api";

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

  describe("moveToSpaceInHub", () => {
    it("should move items between spaces on same Hub", async () => {
      const itemIds = ["id1", "id2"];
      const { store } = loadStore();

      const projectId = "project2";
      store.state.spaces.projectPath[projectId] = {
        spaceProviderId: "hub1",
        spaceId: "space1",
        itemId: "level2",
      };

      await store.dispatch("spaces/moveToSpaceInHub", {
        projectId,
        itemIds,
      });
      expect(mockedAPI.desktop.moveToSpaceInHub).toHaveBeenCalledWith({
        spaceId: "space1",
        spaceProviderId: "hub1",
        itemIds,
      });
    });
  });
});
