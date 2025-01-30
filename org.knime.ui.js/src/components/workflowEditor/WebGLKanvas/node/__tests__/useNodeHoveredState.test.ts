import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import {
  useNodeHoveredStateListener,
  useNodeHoveredStateProvider,
} from "../useNodeHoveredState";

describe("useNodeHoveredState", () => {
  it("should trigger callbacks", async () => {
    const onEnterCallback = vi.fn();
    const onLeaveCallback = vi.fn();

    useNodeHoveredStateListener({
      nodeId: "root:1",
      onEnterCallback,
      onLeaveCallback,
    });

    const { onPointerEnter, onPointerLeave, hoveredNodeId } =
      useNodeHoveredStateProvider();

    expect(onEnterCallback).not.toHaveBeenCalled();
    expect(onLeaveCallback).not.toHaveBeenCalled();

    onPointerEnter("root:2");
    expect(hoveredNodeId.value).toBe("root:2");
    expect(onEnterCallback).not.toHaveBeenCalled();

    onPointerLeave();
    expect(hoveredNodeId.value).toBeNull();
    expect(onLeaveCallback).not.toHaveBeenCalled();

    onPointerEnter("root:1");
    expect(hoveredNodeId.value).toBe("root:1");
    await nextTick();
    expect(onEnterCallback).toHaveBeenCalledWith("root:1");

    onPointerLeave();
    expect(hoveredNodeId.value).toBeNull();
    await nextTick();
    expect(onLeaveCallback).toHaveBeenCalledWith("root:1");
  });
});
