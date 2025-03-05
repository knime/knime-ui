import { type ComputedRef, type ShallowRef, watch } from "vue";
import {
  type AnimationPlaybackControls,
  type ValueAnimationTransition,
  animate,
} from "motion";

import type { ContainerInst } from "@/vue3-pixi";

type Options<T> = {
  /**
   * The object that will be animated
   */
  targetDisplayObject: ShallowRef<ContainerInst | undefined | null>;
  /**
   * Initial value of the tween
   */
  initialValue: T;
  /**
   * Final value of the tween
   */
  targetValue: T;
  /**
   * Function to run as the value is tweened
   */
  onUpdate: (value: T, type: "in" | "out") => void;
  /**
   * Animation options.
   */
  animationParams: Omit<ValueAnimationTransition<T>, "onUpdate">;
  /**
   * Custom optional change tracker to use. If not supplied, the animation
   * will be run based on the truthiness of the `targetDisplayObject` (e.g added / removed)
   */
  changeTracker?: ComputedRef<boolean>;
  /**
   * Whether to animate back from the target value to the initial value.
   * When `false` the onUpdate function will be called *once* sending the initialValue
   */
  animateOut?: boolean;
  /**
   * Whether the watcher that tracks the change should run immediately
   */
  immediate?: boolean;
};

export const useAnimatePixiContainer = <T>(options: Options<T>) => {
  const {
    targetDisplayObject,
    initialValue,
    targetValue,
    animationParams,
    animateOut,
    immediate,
  } = options;

  let activeAnimation: AnimationPlaybackControls | undefined;

  const teardown = () => {
    if (activeAnimation) {
      activeAnimation.stop();
      // eslint-disable-next-line no-undefined
      activeAnimation = undefined;
    }
  };

  const doAnimateIn = () => {
    activeAnimation = animate(initialValue, targetValue, {
      ...animationParams,
      onUpdate: (value) => {
        if (activeAnimation && !targetDisplayObject.value) {
          teardown();
          return;
        }

        options.onUpdate(value, "in");
      },
    });
  };

  const doAnimateOut = () => {
    if (!animateOut) {
      options.onUpdate(initialValue, "out");
      teardown();
      return;
    }

    activeAnimation = animate(targetValue, initialValue, {
      ...animationParams,
      onUpdate: (value) => {
        if (activeAnimation && !targetDisplayObject.value) {
          teardown();
          return;
        }

        options.onUpdate(value, "out");
      },
    });
  };

  watch(
    options.changeTracker ?? targetDisplayObject,
    (nextValue) => {
      if (nextValue) {
        doAnimateIn();
      } else {
        doAnimateOut();
      }
    },
    { immediate },
  );
};
