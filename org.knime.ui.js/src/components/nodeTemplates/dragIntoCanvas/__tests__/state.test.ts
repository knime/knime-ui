import { afterEach, describe, expect, it, vi } from "vitest";

import { createNodeTemplateWithExtendedPorts } from "@/test/factories";
import { useSharedState } from "../state";

describe("shared state", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("shares drag timer", () => {
    const state1 = useSharedState();
    const state2 = useSharedState();

    expect(state1.dragTime.isSet()).toBe(false);
    expect(state2.dragTime.isSet()).toBe(false);

    state1.dragTime.init(window.performance.now());
    expect(state1.dragTime.isSet()).toBe(true);
    expect(state2.dragTime.isSet()).toBe(true);
  });

  it("shares callbacks", () => {
    const state1 = useSharedState();
    const state2 = useSharedState();
    const cb = vi.fn();
    state1.callbacks.schedule("onNodeAdded", cb);

    state2.callbacks.trigger("onNodeAdded", {
      newNodeId: "root:1",
      type: "node",
    });
    expect(cb).toHaveBeenCalledWith({ newNodeId: "root:1", type: "node" });
  });

  it("shares draggedData", () => {
    const state1 = useSharedState();
    const state2 = useSharedState();

    const data = createNodeTemplateWithExtendedPorts();
    state1.draggedTemplateData.value = data;

    expect(state2.draggedTemplateData.value).toEqual(data);
  });
});
