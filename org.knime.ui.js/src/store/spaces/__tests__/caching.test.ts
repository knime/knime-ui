import { describe, expect, it } from "vitest";
import { loadStore } from "./loadStore";
import type { SpaceItemReference } from "@/api/gateway-api/generated-api";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { SpaceProviderNS } from "@/api/custom-types";

describe("spaces::caching", () => {
  describe("actions", () => {
    it("should sync state of projectPaths with openProjects", async () => {
      const { store } = loadStore();

      const hub4 = createSpaceProvider({
        id: "hub4",
        type: SpaceProviderNS.TypeEnum.HUB,
        spaceGroups: [
          createSpaceGroup({
            spaces: [createSpace({ id: "space6" })],
          }),
        ],
      });

      store.commit("spaces/setSpaceProviders", {
        [hub4.id]: hub4,
      });

      // project that should be removed (not part of openProjects anymore)
      store.state.spaces.projectPath.oldProject = {
        spaceId: "space3",
        spaceProviderId: "hub2",
        itemId: "someFolder",
      };

      // currently open projects
      const openProjects: {
        projectId: string;
        origin: Omit<SpaceItemReference, "itemId">; // TODO: remove this field from the API its outdated
      }[] = [
        {
          projectId: "myProject1",
          origin: {
            providerId: "hub2",
            spaceId: "space4",
            ancestorItemIds: [],
          },
        },
        {
          projectId: "newProject3",
          origin: {
            providerId: "hub4",
            spaceId: "space6",
            ancestorItemIds: ["folderX"],
          },
        },
        {
          projectId: "newProject4",
          origin: {
            providerId: "hub4",
            spaceId: "space6",
            ancestorItemIds: [],
          },
        },
      ];

      await store.dispatch("spaces/syncPathWithOpenProjects", {
        openProjects,
      });

      // remove project
      expect(store.state.spaces.projectPath.oldProject).toBeUndefined();

      // add new project
      expect(store.state.spaces.projectPath.newProject3).toStrictEqual({
        spaceProviderId: "hub4",
        spaceId: "space6",
        itemId: "folderX",
      });

      expect(store.state.spaces.projectPath.newProject4).toStrictEqual({
        spaceProviderId: "hub4",
        spaceId: "space6",
        itemId: "root",
      });

      // does NOT update values of already open project (keep user surf state)
      expect(store.state.spaces.projectPath.myProject1).toStrictEqual({
        spaceProviderId: "mockProviderId",
        spaceId: "mockSpaceId",
        itemId: "bar",
      });
    });

    it('should use fallback to "root" when ancestorItemIds is missing', async () => {
      const { store } = loadStore();

      const hub1 = createSpaceProvider({
        id: "hub1",
        type: SpaceProviderNS.TypeEnum.HUB,
        spaces: [createSpace({ id: "space1" })],
      });

      store.commit("spaces/setSpaceProviders", {
        [hub1.id]: hub1,
      });

      // currently open projects
      const openProjects: {
        projectId: string;
        origin: Omit<SpaceItemReference, "itemId">; // TODO: remove this field from the API its outdated
      }[] = [
        {
          projectId: "myProject2",
          origin: {
            providerId: "hub1",
            spaceId: "space1",
          },
        },
      ];

      await store.dispatch("spaces/syncPathWithOpenProjects", {
        openProjects,
      });

      expect(store.state.spaces.projectPath.myProject2).toStrictEqual({
        spaceProviderId: "hub1",
        spaceId: "space1",
        itemId: "root",
      });
    });

    it("should fallback to local when open project refers to an unknown space", async () => {
      const { store } = loadStore();

      const hub1 = createSpaceProvider({
        id: "hub1",
        type: SpaceProviderNS.TypeEnum.HUB,
        spaces: [createSpace({ id: "space1" }), createSpace({ id: "space2" })],
      });

      store.commit("spaces/setSpaceProviders", {
        [hub1.id]: hub1,
      });

      const openProjects: {
        projectId: string;
        origin: Omit<SpaceItemReference, "itemId">; // TODO: remove this field from the API its outdated
      }[] = [
        {
          projectId: "myProject2",
          origin: {
            providerId: "hub1",
            spaceId: "this-is-an-unknown-space",
          },
        },
      ];

      await store.dispatch("spaces/syncPathWithOpenProjects", {
        openProjects,
      });

      expect(store.state.spaces.projectPath.myProject2).toStrictEqual({
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "root",
      });
    });

    it("should take the local root for default with a workflow without origin", async () => {
      const { store } = loadStore();

      await store.dispatch("spaces/syncPathWithOpenProjects", {
        openProjects: [{ projectId: "myProject1" }],
      });

      expect(store.state.spaces.projectPath.myProject1).toStrictEqual({
        spaceProviderId: "mockProviderId",
        spaceId: "mockSpaceId",
        itemId: "bar",
      });
    });
  });

  describe("getters", () => {
    it("should getWorkflowGroupContent by projectId", async () => {
      const { store } = loadStore();

      await store.dispatch("spaces/syncPathWithOpenProjects", {
        openProjects: [{ projectId: "myProject1" }],
      });

      store.commit("spaces/setWorkflowGroupContent", {
        projectId: "myProject1",
        content: { items: [], path: [] },
      });

      expect(
        store.getters["spaces/getWorkflowGroupContent"]("unknown"),
      ).toBeNull();

      expect(
        store.getters["spaces/getWorkflowGroupContent"]("myProject1"),
      ).toEqual({ items: [], path: [] });
    });
  });
});
