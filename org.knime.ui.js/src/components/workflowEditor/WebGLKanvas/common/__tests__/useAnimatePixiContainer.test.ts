import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick, ref, shallowRef } from "vue";
import { Container } from "pixi.js";

import { useAnimatePixiContainer } from "../useAnimatePixiContainer";

const stopAnimation = vi.fn();
vi.mock("motion", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    animate: (...args) => ({
      // @ts-expect-error
      ...actual.animate(...args),
      stop: stopAnimation,
    }),
  };
});

describe("useAnimatePixiContainer", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("animates from initial to target value", async () => {
    const container = new Container();
    container.alpha = 0;
    const changeTrackerRef = ref(false);

    useAnimatePixiContainer<number>({
      initialValue: 0,
      targetValue: 1,
      targetDisplayObject: shallowRef(container),
      changeTracker: computed(() => changeTrackerRef.value),
      animationParams: { duration: 0.02 },
      onUpdate: (v) => {
        container.alpha = v;
      },
    });

    expect(container.alpha).toBe(0);

    changeTrackerRef.value = true;
    // let animation run
    await new Promise((r) => setTimeout(r, 100));
    expect(stopAnimation).not.toHaveBeenCalled();
    expect(container.alpha).toBe(1);
  });

  it("cancels animation", async () => {
    const container = new Container();
    container.alpha = 0;
    const changeTrackerRef = ref(false);

    useAnimatePixiContainer<number>({
      initialValue: 0,
      targetValue: 1,
      targetDisplayObject: shallowRef(container),
      changeTracker: computed(() => changeTrackerRef.value),
      animationParams: { duration: 0.02 },
      onUpdate: (v) => {
        container.alpha = v;
      },
    });

    expect(container.alpha).toBe(0);

    // trigger change in quick succession
    changeTrackerRef.value = true;
    await nextTick();
    changeTrackerRef.value = false;
    await nextTick();

    expect(stopAnimation).toHaveBeenCalledOnce();
    expect(container.alpha).toBe(0);
  });
});
