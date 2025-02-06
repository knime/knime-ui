import { describe, expect, it, vi } from "vitest";

import { $bus } from "@/plugins/event-bus";
import { mountComposable } from "@/test/utils/mountComposable";
import { useGlobalBusListener } from "../useGlobalBusListener";

const mockedBus = vi.mocked($bus);
vi.mock("@/plugins/event-bus", () => ({
  $bus: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));

describe("useGlobalBusListener", () => {
  it("should register on mount and cleaup on unmount", () => {
    const callback = vi.fn();

    const { lifeCycle } = mountComposable({
      composable: useGlobalBusListener,
      composableProps: {
        eventName: "connector-start",
        handler: callback,
      },
    });

    expect(mockedBus.on).toHaveBeenCalledWith("connector-start", callback);

    lifeCycle.unmount();

    expect(mockedBus.off).toHaveBeenCalledWith("connector-start", callback);
  });
});
