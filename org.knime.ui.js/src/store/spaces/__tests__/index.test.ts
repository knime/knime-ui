import { beforeEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import type { DestinationPickerResult } from "@/components/spaces/DestinationPicker/useDestinationPicker";
import { getToastsProvider } from "@/plugins/toasts";
import { deepMocked, mockedObject } from "@/test/utils";

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

  describe("download from space", () => {
    it("should download items from a space", async () => {
      const itemIds = ["id1", "id2"];
      const { spacesStore, spaceCachingStore } = loadStore();

      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };

      await spacesStore.downloadFromSpace({
        itemIds,
        projectId,
      });
      expect(mockedAPI.desktop.downloadFromSpace).toHaveBeenCalledWith({
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

  describe("uploadToSpace", () => {
    const mockToast = mockedObject(getToastsProvider());

    it("should show a success toast after successful upload", async () => {
      mockedAPI.desktop.uploadToSpace.mockReturnValue(["newRemoteId"]);
      const { spacesStore } = loadStore();

      await spacesStore.uploadToSpace({
        itemIds: ["id1"],
        openAfterUpload: false,
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        headline: "Upload complete",
        type: "success",
        buttons: expect.anything(),
      });
    });

    it("should skip toast notification if return value is empty", async () => {
      mockedAPI.desktop.uploadToSpace.mockReturnValue([]);
      const { spacesStore } = loadStore();

      await spacesStore.uploadToSpace({
        itemIds: ["id1"],
        openAfterUpload: false,
      });

      expect(mockToast.show).not.toHaveBeenCalled();
    });

    it("should open the uploaded workflow if openAfterUpload is true", async () => {
      mockedAPI.desktop.uploadToSpace.mockReturnValue(["mockWorkflowId"]);
      const { spacesStore, spaceOperationsStore } = loadStore();
      const mockOpenProject = vi.fn();
      vi.mocked(spaceOperationsStore.openProject).mockImplementation(
        mockOpenProject,
      );

      mockedAPI.space.listWorkflowGroup.mockResolvedValueOnce({
        items: [{ name: "testWorkflow", id: "mockWorkflowId" }],
      });

      await spacesStore.uploadToSpace({
        itemIds: ["id1"],
        openAfterUpload: true,
      });

      expect(mockOpenProject).toHaveBeenCalledWith({
        providerId: "mockDestinationSpaceProviderId",
        spaceId: "mockDestinationSpaceId",
        itemId: "mockWorkflowId",
        $router: undefined,
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
