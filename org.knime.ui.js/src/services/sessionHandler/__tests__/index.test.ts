import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";

import { $bus } from "@/plugins/event-bus";
import { getToastPresets } from "@/services/toastPresets";
import { sessionHandler } from "..";

const addEventListener = vi.fn();

describe("sessionHandler", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should attach listeners for connection loss", async () => {
    const spy = vi.spyOn(window, "addEventListener");
    const busEmitSpy = vi.spyOn($bus, "emit");

    const { toastPresets } = getToastPresets();
    const connectionLossToastSpy = vi.spyOn(
      toastPresets.connectivity,
      "connectionLoss",
    );
    const connectionRestoredToastSpy = vi.spyOn(
      toastPresets.connectivity,
      "connectionRestored",
    );

    sessionHandler.init({
      addEventListener,
      removeEventListener: vi.fn(),
    } as any);

    expect(addEventListener).toHaveBeenCalledWith(
      "close",
      expect.any(Function),
    );

    expect(spy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(spy).toHaveBeenCalledWith("offline", expect.any(Function));

    window.dispatchEvent(new Event("offline"));

    expect(connectionLossToastSpy).toHaveBeenCalled();

    await flushPromises();
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));

    expect(busEmitSpy).toHaveBeenCalledWith("block-ui");

    window.dispatchEvent(new Event("online"));

    expect(connectionRestoredToastSpy).toHaveBeenCalled();

    expect(busEmitSpy).toHaveBeenCalledWith("unblock-ui");
  });
});
