import { beforeEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import type { DestinationPickerResult } from "@/components/spaces/DestinationPicker/useDestinationPicker";
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

vi.mock("@/store/spaces/util", () => ({
  checkOpenWorkflowsBeforeMove: checkOpenWorkflowsBeforeMoveMock,
}));

describe("spaces::index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("copyBetweenSpace", () => {
    it("should copy items between spaces", async () => {
      const itemIds = ["id1", "id2"];
      const { spacesStore, spaceCachingStore } = loadStore();

      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };

      await spacesStore.copyBetweenSpaces({
        projectId,
        itemIds,
      });
      expect(mockedAPI.desktop.copyBetweenSpaces).toHaveBeenCalledWith({
        sourceProviderId: "local",
        sourceSpaceId: "local",
        sourceItemIds: itemIds,
        destinationProviderId: "mockDestinationSpaceProviderId",
        destinationSpaceId: "mockDestinationSpaceId",
        destinationItemId: "mockDestinationItemId",
        excludeData: true,
      });
    });
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
});
