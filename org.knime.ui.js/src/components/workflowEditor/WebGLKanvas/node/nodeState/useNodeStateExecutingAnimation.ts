import { ref, watch } from "vue";
import { type AnimationPlaybackControls, animate } from "motion";
import type { Container } from "pixi.js";

const X_OFFSET = 20;
export const useNodeStateExecutingAnimation = () => {
  const containerRef = ref<Container>();

  let currentAnimation: AnimationPlaybackControls;

  const doAnimate = () => {
    if (!containerRef.value) {
      consola.error("Container unset or invalid");
      return;
    }

    currentAnimation = animate(containerRef.value.x, X_OFFSET, {
      duration: 0.8,
      // eslint-disable-next-line no-magic-numbers
      ease: [0.5, 0, 0.5, 1],
      repeat: Infinity,
      repeatType: "reverse",
      onUpdate: (v) => {
        if (containerRef.value) {
          containerRef.value.x = v;
        } else {
          currentAnimation.stop();
        }
      },
    });
  };

  watch([containerRef], () => {
    if (containerRef.value && !currentAnimation) {
      doAnimate();
      return;
    }

    if (!containerRef.value && currentAnimation) {
      currentAnimation.stop();
    }
  });

  return { containerRef };
};
