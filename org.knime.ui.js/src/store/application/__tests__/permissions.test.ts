import { afterEach, describe, expect, it, vi } from "vitest";
import { loadStore } from "./loadStore";

describe("application::permissions", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  it("should set the permissions", () => {
    const { store } = loadStore();

    expect(store.state.application.permissions.canConfigureNodes).toBe(true);
    store.commit("application/setPermissions", { canConfigureNodes: false });
    expect(store.state.application.permissions.canConfigureNodes).toBe(false);
  });
});
