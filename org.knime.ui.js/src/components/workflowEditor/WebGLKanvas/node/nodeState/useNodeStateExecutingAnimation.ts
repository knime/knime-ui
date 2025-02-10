import { ref, watch } from "vue";
import { gsap } from "gsap";
import type { Container } from "pixi.js";

export const useNodeStateExecutingAnimation = () => {
  const containerRef = ref<Container>();

  let currentAnimation: gsap.core.Tween;

  const animate = () => {
    if (!containerRef.value) {
      consola.error("Container unset or invalid");
      return;
    }

    currentAnimation = gsap.to(containerRef.value, {
      x: 20,
      duration: 0.8, // 800ms
      ease: "power1.inOut", // Similar to cubic-bezier(0.5, 0, 0.5, 1)
      repeat: -1, // Infinite loop
      yoyo: true, // Reverse back from end value to beginning smoothly
    });
  };

  watch([containerRef], () => {
    if (containerRef.value && !currentAnimation) {
      animate();
      return;
    }

    if (!containerRef.value && currentAnimation) {
      currentAnimation.kill();
    }
  });

  return { containerRef };
};
