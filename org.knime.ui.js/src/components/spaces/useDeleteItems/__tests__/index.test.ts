import { beforeEach, describe, expect, it, vi } from "vitest";
import { type FunctionalComponent, ref } from "vue";

import { useDeleteItems } from "@/components/spaces/useDeleteItems";
import { isBrowser, isDesktop } from "@/environment";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
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

vi.mock("@/environment");

describe("useDeleteItems::index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["BROWSER" as const, "and opens", 0],
    ["DESKTOP" as const, "but does not open", 1],
  ])(
    "for environment %s calls deleteItems from spaceOperationsStore %s confirmation dialog",
    async (environment, _testDescriptionPart, expectedCalls) => {
      const mockedStores = mockStores();
      mockEnvironment(environment, { isBrowser, isDesktop });
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
