import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import { isBrowser, isDesktop } from "@/environment";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { useQuickActionMenuMode } from "../useQuickActionMenuMode";

vi.mock("@/environment");

describe("useQuickActionMenuMode", () => {
  const doMount = () => {
    const mockedStores = mockStores();
    const result = mountComposable({
      composable: useQuickActionMenuMode,
      composableProps: {
        port: ref(null),
        nodeRelation: ref(null),
      },
      mockedStores,
    });
    return { ...result, mockedStores };
  };

  it("remembers active mode", () => {
    const result1 = doMount();

    result1.getComposableResult().activeMode.value = "components";

    const result2 = doMount();
    expect(result2.getComposableResult().activeMode.value).toBe("components");
  });

  it("returns all available modes (BROWSER)", async () => {
    mockEnvironment("BROWSER", { isBrowser, isDesktop });
    const { getComposableResult, mockedStores } = doMount();
    expect(getComposableResult().availableModes.value).toEqual([
      { id: "nodes", text: "Nodes" },
      { id: "components", text: "Components" },
      { id: "k-ai", text: "K-AI Build mode" },
    ]);

    mockedStores.applicationSettingsStore.isKaiEnabled = false;
    expect(getComposableResult().availableModes.value).toEqual([
      { id: "nodes", text: "Nodes" },
      { id: "components", text: "Components" },
    ]);

    mockedStores.applicationSettingsStore.isKaiEnabled = true;
    (mockedStores.aiAssistantStore.isQuickBuildModeAvailable as any) = () =>
      false;

    await nextTick();
    expect(getComposableResult().availableModes.value).toEqual([
      { id: "nodes", text: "Nodes" },
      { id: "components", text: "Components" },
    ]);
  });

  it("returns all available modes (DESKTOP)", async () => {
    mockEnvironment("DESKTOP", { isBrowser, isDesktop });
    const { getComposableResult, mockedStores } = doMount();
    expect(getComposableResult().availableModes.value).toEqual([
      { id: "nodes", text: "Nodes" },
      { id: "k-ai", text: "K-AI Build mode" },
    ]);

    mockedStores.applicationSettingsStore.isKaiEnabled = false;
    expect(getComposableResult().availableModes.value).toEqual([
      { id: "nodes", text: "Nodes" },
    ]);

    mockedStores.applicationSettingsStore.isKaiEnabled = true;
    (mockedStores.aiAssistantStore.isQuickBuildModeAvailable as any) = () =>
      false;

    await nextTick();
    expect(getComposableResult().availableModes.value).toEqual([
      { id: "nodes", text: "Nodes" },
    ]);
  });

  it("moves away from k-ai mode", async () => {
    const { getComposableResult, mockedStores } = doMount();
    getComposableResult().activeMode.value = "k-ai";
    expect(getComposableResult().activeMode.value).toBe("k-ai");

    mockedStores.applicationSettingsStore.isKaiEnabled = false;
    await nextTick();
    expect(getComposableResult().activeMode.value).toBe("nodes");
  });
});
