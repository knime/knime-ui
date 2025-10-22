import { beforeAll, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import { embeddingSDK } from "@knime/hub-features";

import { mountComposable } from "@/test/utils/mountComposable";

vi.mock("@knime/hub-features");

const idle = ref(false);
const lastActive = ref(new Date("2025-10-04").getTime());

vi.doMock("@vueuse/core", async (importOriginal) => {
  const actual = (await importOriginal()) as any;

  return {
    ...actual,
    useIdle: () => ({ idle, lastActive }),
  };
});

describe("useIdleUserTracking", () => {
  beforeAll(() => {
    vi.mocked(embeddingSDK.guest).getContext.mockReturnValue({
      wsConnectionUri: "",
      restApiBaseUrl: "",
      userIdleTimeout: 3000,
      jobId: "",
    });
  });

  it("sends activity events", async () => {
    const { useIdleUserTracking } = await import("../useIdleUserTracking");

    mountComposable({
      composable: useIdleUserTracking,
      composableProps: undefined,
    });

    const notifyActivitySpy = vi.mocked(
      embeddingSDK.guest,
    ).notifyActivityChange;

    expect(notifyActivitySpy).not.toHaveBeenCalled();

    idle.value = true;
    await nextTick();
    expect(notifyActivitySpy).toHaveBeenCalledWith({
      idle: true,
      lastActive: new Date(lastActive.value).toISOString(),
    });
  });
});
