import { ref } from "vue";

/**
 * A module-level reactive counter that increments every animation frame.
 * Components can depend on this ref to trigger re-renders on each frame.
 * Use conditionally (e.g. `props.isAnimating ? animFrame.value : 0`) so
 * the reactive subscription — and therefore the per-frame re-render — is
 * only active when the component actually needs animation.
 */
export const animFrame = ref(0);

function loop() {
  animFrame.value = animFrame.value + 1;
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
