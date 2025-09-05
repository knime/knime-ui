import { beforeEach, describe, expect, it, vi } from "vitest";
import { type FunctionalComponent, ref } from "vue";

import { useDeleteItems } from "@/components/spaces/useDeleteItems";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { mockStores } from "@/test/utils/mockStores";

const mockShow = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    confirmed: true,
  }),
);
vi.mock("@/composables/useConfirmDialog", () => ({
  useConfirmDialog: () => ({
    show: mockShow,
  }),
}));
await import("@/composables/useConfirmDialog");

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
      (mockedStores.spaceOperationsStore as any).softDelete = softDelete;
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
});
