import { beforeEach, describe, expect, it, vi } from "vitest";
import { type FunctionalComponent, ref } from "vue";

import { useDeleteItems } from "@/components/spaces/useDeleteItems";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { mockStores } from "@/test/utils/mockStores";
import { useMockEnvironment } from "@/test/utils/useMockEnvironment";

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

const mockEnvironment = vi.hoisted(
  () => ({}),
) as typeof import("@/environment");
vi.mock("@/environment", async (importOriginal) => {
  Object.assign(mockEnvironment, await importOriginal());
  return mockEnvironment;
});
const { setEnvironment } = useMockEnvironment(mockEnvironment);

describe("useDeleteItems::index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["BROWSER", "and opens", 0],
    ["DESKTOP", "but does not open", 1],
  ])(
    "for environment %s calls deleteItems from spaceOperationsStore %s confirmation dialog",
    async (
      environment: string,
      _testDescriptionPart: string,
      expectedCalls: number,
    ) => {
      const mockedStores = mockStores();
      setEnvironment(environment as any);
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
