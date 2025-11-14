import { beforeEach, describe, expect, it, vi } from "vitest";
import { type FunctionalComponent, ref } from "vue";

import type { FileExplorerItem } from "@knime/components";

import { SpaceProviderNS } from "@/api/custom-types.ts";
import { SpaceItem } from "@/api/gateway-api/generated-api";
import { useDeleteItems } from "@/components/spaces/useDeleteItems";
import { getToastsProvider } from "@/plugins/toasts";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { createSpaceProvider } from "@/test/factories";
import { mockedObject } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

const createMockItem = (
  data: Partial<FileExplorerItem> = {},
): FileExplorerItem => ({
  id: "dummy",
  name: "dummy",
  canBeRenamed: true,
  canBeDeleted: true,
  isDirectory: false,
  isOpenableFile: true,
  isOpen: false,
  meta: {
    type: SpaceItem.TypeEnum.Workflow,
  },
  ...data,
});

const mockShow = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    confirmed: true,
  }),
);

vi.mock("@knime/kds-components", () => ({
  useConfirmDialog: () => ({
    show: mockShow,
  }),
}));

const mockWindowOpen = vi.hoisted(() => vi.fn());
vi.stubGlobal("open", mockWindowOpen);

describe("useDeleteItems::index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [true, "without", 0],
    [false, "with", 1],
  ])(
    "when softDelete is %s, calls deleteItems from spaceOperationsStore %s confirmation dialog",
    async (softDelete, _testDescriptionPart, expectedCalls) => {
      const mockedStores = mockStores();

      mockedStores.spaceOperationsStore.getDeletionInfo = () => ({
        canSoftDelete: softDelete,
        groupName: "groupName",
      });

      const { onDeleteItems } = useDeleteItems({
        projectId: ref("projectId"),
        itemIconRenderer: vi.fn(() => ({}) as FunctionalComponent),
      });
      vi.mocked(useSpaceOperationsStore().deleteItems).mockResolvedValueOnce();

      await onDeleteItems([]);

      expect(mockShow).toHaveBeenCalledTimes(expectedCalls);
      expect(
        mockedStores.spaceOperationsStore.deleteItems,
      ).toHaveBeenCalledTimes(1);
    },
  );

  it("should open recycle bin when clicking toast button", async () => {
    const mockedStores = mockStores();
    const groupName = "my-group";
    const recycleBinUrl = "http://recycle.url";

    mockedStores.spaceOperationsStore.getDeletionInfo = () => ({
      canSoftDelete: true,
      groupName,
    });

    mockedStores.spaceProvidersStore.getProviderInfoFromProjectPath = () =>
      createSpaceProvider({
        id: "mockProviderId",
        type: SpaceProviderNS.TypeEnum.HUB,
      });

    // noinspection JSConstantReassignment
    mockedStores.spaceProvidersStore.getRecycleBinUrl = () => recycleBinUrl;

    const { onDeleteItems } = useDeleteItems({
      projectId: ref("projectId"),
      itemIconRenderer: vi.fn(() => ({}) as FunctionalComponent),
    });
    vi.mocked(useSpaceOperationsStore().deleteItems).mockResolvedValueOnce();

    await onDeleteItems([createMockItem({ id: "item-id", name: "item-name" })]);

    const toast = mockedObject(getToastsProvider());
    expect(toast.show).toHaveBeenCalled();

    const toastOptions = vi.mocked(toast.show).mock.calls[0][0];
    const button = toastOptions.buttons!.find(
      (b) => b.text === "Show recycle bin",
    );
    expect(button).toBeDefined();
    if (button?.callback) {
      button.callback();
    } else {
      expect.fail("The button should have a callback.");
    }
    expect(mockWindowOpen).toHaveBeenCalledWith(recycleBinUrl);
  });
});
