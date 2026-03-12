import { beforeEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { SpaceProviderNS } from "@/api/custom-types";
import type { DestinationPickerResult } from "@/components/spaces/DestinationPicker/useDestinationPicker";
import { createSpaceProvider } from "@/test/factories";
import { deepMocked } from "@/test/utils";

import { loadStore } from "./loadStore";

const mockedAPI = deepMocked(API);

vi.mock("@/components/spaces/DestinationPicker/useDestinationPicker", () => {
  return {
    useDestinationPicker: () => ({
      presets: {
        UPLOAD_PICKERCONFIG: {},
        DOWNLOAD_PICKERCONFIG: {},
      },
      promptDestination: vi.fn().mockResolvedValue({
        type: "item",
        spaceProviderId: "mockDestinationSpaceProviderId",
        spaceId: "mockDestinationSpaceId",
        itemId: "mockDestinationItemId",
        resetWorkflow: true,
        isWorkflowContainer: true,
      } satisfies DestinationPickerResult),
    }),
  };
});

const { checkOpenWorkflowsBeforeMoveMock } = vi.hoisted(() => ({
  checkOpenWorkflowsBeforeMoveMock: vi.fn().mockReturnValue(false),
}));

vi.mock("@/store/spaces/util", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/store/spaces/util")>()),
  checkOpenWorkflowsBeforeMove: checkOpenWorkflowsBeforeMoveMock,
}));

describe("spaces::index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("moveOrCopyToSpace", () => {
    it("should move items between spaces on same Hub", async () => {
      const itemIds = ["id1", "id2"];
      const { spacesStore, spaceCachingStore, spaceOperationsStore } =
        loadStore();

      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "hub1",
        spaceId: "space1",
        itemId: "level2",
      };

      await spacesStore.moveOrCopyToSpace({
        projectId,
        isCopy: false,
        itemIds,
      });
      expect(mockedAPI.space.moveOrCopyItems).toHaveBeenCalledWith({
        spaceId: "space1",
        spaceProviderId: "hub1",
        copy: false,
        itemIds,
        destSpaceId: "mockDestinationSpaceId",
        destWorkflowGroupItemId: "mockDestinationItemId",
      });
      expect(
        spaceOperationsStore.fetchWorkflowGroupContent,
      ).toHaveBeenCalledWith({ projectId });
    });

    it("should not move items if there are opened items among them", async () => {
      checkOpenWorkflowsBeforeMoveMock.mockReturnValueOnce(true);
      const itemIds = ["id1", "id2"];
      const { spacesStore, spaceCachingStore } = loadStore();

      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "hub1",
        spaceId: "space1",
        itemId: "level2",
      };
      await spacesStore.moveOrCopyToSpace({
        projectId,
        isCopy: false,
        itemIds,
      });
      expect(mockedAPI.space.moveOrCopyItems).not.toHaveBeenCalled();
    });
  });

  describe("buildHubAppHomeShortLink", () => {
    it("builds /a/ links for hub providers", () => {
      const { spacesStore, spaceCachingStore, spaceProvidersStore } =
        loadStore();
      const projectId = "project2";

      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "hub1",
        spaceId: "space1",
        itemId: "root",
      };
      spaceProvidersStore.spaceProviders = {
        hub1: createSpaceProvider({
          id: "hub1",
          type: SpaceProviderNS.TypeEnum.HUB,
          hostname: "https://api.knime.com/hub",
        }),
      };

      expect(
        spacesStore.buildHubAppHomeShortLink({
          projectId,
          itemId: "*workflow-id",
        }),
      ).toBe("https://knime.com/hub/a/workflow-id");
    });

    it("returns null for non-hub providers", () => {
      const { spacesStore, spaceCachingStore, spaceProvidersStore } =
        loadStore();
      const projectId = "project2";

      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "server1",
        spaceId: "space1",
        itemId: "root",
      };
      spaceProvidersStore.spaceProviders = {
        server1: createSpaceProvider({
          id: "server1",
          type: SpaceProviderNS.TypeEnum.SERVER,
          hostname: "https://api.knime.com/server",
        }),
      };

      expect(
        spacesStore.buildHubAppHomeShortLink({
          projectId,
          itemId: "*workflow-id",
        }),
      ).toBeNull();
    });
  });
});
