import { describe, expect, it } from "vitest";

import { loadStore } from "./loadStore";

describe("application::settings", () => {
  it("sets the clipboard support flag", () => {
    const { store } = loadStore();
    store.commit("application/setHasClipboardSupport", true);
    expect(store.state.application.hasClipboardSupport).toBe(true);
  });

  it("sets the has node recommendations enabled flag", () => {
    const { store } = loadStore();
    store.commit("application/setHasNodeRecommendationsEnabled", true);
    expect(store.state.application.hasNodeRecommendationsEnabled).toBe(true);
  });

  it("sets available updates", () => {
    const { store } = loadStore();
    store.commit("application/setAvailableUpdates", {
      newReleases: undefined,
      bugfixes: ["Update1", "Update2"],
    });
    expect(store.state.application.availableUpdates).toStrictEqual({
      newReleases: undefined,
      bugfixes: ["Update1", "Update2"],
    });
  });

  it("sets hasNodeCollectionActive", () => {
    const { store } = loadStore();
    store.commit("application/setHasNodeCollectionActive", true);
    expect(store.state.application.hasNodeCollectionActive).toBe(true);
  });

  it("sets devMode", () => {
    const { store } = loadStore();
    store.commit("application/setDevMode", true);
    expect(store.state.application.devMode).toBe(true);
  });
});
