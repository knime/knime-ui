import { describe, expect, it, vi } from "vitest";

import { getToastsProvider } from "../toasts";

vi.unmock("@/plugins/toasts");

describe("toasts", () => {
  it("should get the toasts provider as a singleton", () => {
    const provider1 = getToastsProvider();

    const toast = { message: "Dummy Toast" };
    provider1.show(toast);

    const provider2 = getToastsProvider();

    expect(provider2.toasts.value.length).toBe(1);
    expect(provider2.toasts.value.at(0)).toEqual(
      expect.objectContaining(toast),
    );
  });
});
