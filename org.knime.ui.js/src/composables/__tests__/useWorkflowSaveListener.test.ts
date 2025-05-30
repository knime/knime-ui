import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { useEventBus } from "@vueuse/core";

import { mountComposable } from "@/test/utils/mountComposable";
import { onWorkflowSaved } from "../useWorkflowSaveListener";

describe("onWorkflowSaved", () => {
  let mockHandler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockHandler = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should register handler on mount and call it when event is emitted", async () => {
    const { lifeCycle } = mountComposable({
      composable: onWorkflowSaved,
      composableProps: mockHandler,
    });

    const savedBus = useEventBus("workflow-saved");

    savedBus.emit();
    await nextTick();

    expect(mockHandler).toHaveBeenCalledOnce();

    lifeCycle.unmount();
  });

  it("should handle async handlers", async () => {
    const asyncHandler = vi.fn().mockResolvedValue(undefined);

    const { lifeCycle } = mountComposable({
      composable: onWorkflowSaved,
      composableProps: asyncHandler,
    });

    const savedBus = useEventBus("workflow-saved");

    savedBus.emit();
    await nextTick();

    expect(asyncHandler).toHaveBeenCalledOnce();

    lifeCycle.unmount();
  });

  it("should unregister handler on unmount", async () => {
    const { lifeCycle } = mountComposable({
      composable: onWorkflowSaved,
      composableProps: mockHandler,
    });

    lifeCycle.unmount();

    const savedBus = useEventBus("workflow-saved");

    savedBus.emit();
    await nextTick();

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should handle multiple handlers for the same event", async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const { lifeCycle: lifeCycle1 } = mountComposable({
      composable: onWorkflowSaved,
      composableProps: handler1,
    });
    const { lifeCycle: lifeCycle2 } = mountComposable({
      composable: onWorkflowSaved,
      composableProps: handler2,
    });

    const savedBus = useEventBus("workflow-saved");

    savedBus.emit();
    await nextTick();

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();

    lifeCycle1.unmount();
    lifeCycle2.unmount();
  });
});
