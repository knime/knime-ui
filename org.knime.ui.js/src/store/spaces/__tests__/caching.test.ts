import { describe, expect, it } from "vitest";

import { SpaceProviderNS } from "@/api/custom-types";
import {
  SpaceItem,
  type SpaceItemReference,
} from "@/api/gateway-api/generated-api";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";

import { loadStore } from "./loadStore";

describe("spaces::caching", () => {
  describe("actions", () => {
    it("should sync state of projectPaths with openProjects", async () => {
      const { spaceCachingStore, spaceProvidersStore } = loadStore();

      const hub4 = createSpaceProvider({
        id: "hub4",
        type: SpaceProviderNS.TypeEnum.HUB,
        spaceGroups: [
          createSpaceGroup({
            spaces: [createSpace({ id: "space6" })],
          }),
        ],
      });

      spaceProvidersStore.setSpaceProviders({
        [hub4.id]: hub4,
      });

      // project that should be removed (not part of openProjects anymore)
      spaceCachingStore.projectPath.oldProject = {
        spaceId: "space3",
        spaceProviderId: "hub2",
        itemId: "someFolder",
      };

      // currently open projects
      const openProjects: {
        projectId: string;
        origin: Omit<SpaceItemReference, "itemId">; // TODO: remove this field from the API its outdated
        name: string;
      }[] = [
        {
          projectId: "myProject1",
          name: "My Project 1",
          origin: {
            providerId: "hub2",
            spaceId: "space4",
            ancestorItemIds: [],
          },
        },
        {
          projectId: "newProject3",
          name: "New Project 3",
          origin: {
            providerId: "hub4",
            spaceId: "space6",
            ancestorItemIds: ["folderX"],
          },
        },
        {
          projectId: "newProject4",
          name: "New Project 4",
          origin: {
            providerId: "hub4",
            spaceId: "space6",
            ancestorItemIds: [],
          },
        },
      ];

      await spaceCachingStore.syncPathWithOpenProjects({
        // @ts-ignore
        openProjects,
      });

      // remove project
      expect(spaceCachingStore.projectPath.oldProject).toBeUndefined();

      // add new project
      expect(spaceCachingStore.projectPath.newProject3).toStrictEqual({
        spaceProviderId: "hub4",
        spaceId: "space6",
        itemId: "folderX",
      });

      expect(spaceCachingStore.projectPath.newProject4).toStrictEqual({
        spaceProviderId: "hub4",
        spaceId: "space6",
        itemId: "root",
      });

      // does NOT update values of already open project (keep user surf state)
      expect(spaceCachingStore.projectPath.myProject1).toStrictEqual({
        spaceProviderId: "mockProviderId",
        spaceId: "mockSpaceId",
        itemId: "bar",
      });
    });

    it('should use fallback to "root" when ancestorItemIds is missing', async () => {
      const { spaceCachingStore, spaceProvidersStore } = loadStore();

      const hub1 = createSpaceProvider({
        id: "hub1",
        type: SpaceProviderNS.TypeEnum.HUB,
      });

      spaceProvidersStore.setSpaceProviders({
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

      await spaceCachingStore.syncPathWithOpenProjects({
        // @ts-ignore
        openProjects,
      });

      expect(spaceCachingStore.projectPath.myProject2).toStrictEqual({
        spaceProviderId: "hub1",
        spaceId: "space1",
        itemId: "root",
      });
    });

    it("should fallback to local when open project refers to an unknown space", async () => {
      const { spaceCachingStore, spaceProvidersStore } = loadStore();

      const hub1 = createSpaceProvider({
        id: "hub1",
        type: SpaceProviderNS.TypeEnum.HUB,
        spaceGroups: [
          createSpaceGroup({
            spaces: [
              createSpace({ id: "space1" }),
              createSpace({ id: "space2" }),
            ],
          }),
        ],
      });

      spaceProvidersStore.setSpaceProviders({
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

      await spaceCachingStore.syncPathWithOpenProjects({
        // @ts-ignore
        openProjects,
      });

      expect(spaceCachingStore.projectPath.myProject2).toStrictEqual({
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "root",
      });
    });

    it("should take the local root for default with a workflow without origin", async () => {
      const { spaceCachingStore } = loadStore();

      await spaceCachingStore.syncPathWithOpenProjects({
        // @ts-ignore
        openProjects: [{ projectId: "myProject1" }],
      });

      expect(spaceCachingStore.projectPath.myProject1).toStrictEqual({
        spaceProviderId: "mockProviderId",
        spaceId: "mockSpaceId",
        itemId: "bar",
      });
    });
  });

  describe("getters", () => {
    it("should getWorkflowGroupContent by projectId", async () => {
      const { spaceCachingStore } = loadStore();

      await spaceCachingStore.syncPathWithOpenProjects({
        // @ts-ignore
        openProjects: [{ projectId: "myProject1" }],
      });

      spaceCachingStore.setWorkflowGroupContent({
        projectId: "myProject1",
        content: {
          items: [
            {
              id: "mockSpaceItemId1",
              name: "Mock Space Item",
              type: SpaceItem.TypeEnum.Workflow,
            },
          ],
          path: [
            { id: "pathSeg1Id", name: "Mock Seg 1" },
            { id: "pathSeg2Id", name: "Mock Seg 2" },
          ],
        },
      });

      expect(spaceCachingStore.getWorkflowGroupContent("unknown")).toBeNull();

      expect(spaceCachingStore.getWorkflowGroupContent("myProject1")).toEqual({
        items: [
          {
            id: "mockSpaceItemId1",
            name: "Mock Space Item",
            type: SpaceItem.TypeEnum.Workflow,
          },
        ],
        path: [
          { id: "pathSeg1Id", name: "Mock Seg 1" },
          { id: "pathSeg2Id", name: "Mock Seg 2" },
        ],
      });
    });
  });
});
