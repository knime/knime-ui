<script>
import { throttle } from "lodash-es";

const SCROLL_HANDLER_THROTTLE = 100;

export default {
  props: {
    initialPosition: {
      type: Number,
      default: 0,
    },
  },
  emits: ["savePosition", "scrollBottom"],
  data() {
    return {
      scrollPosition: this.initialPosition,
      lastScrollHeight: 0,
    };
  },
  mounted() {
    this.$refs.scroller.scrollTop = this.initialPosition;
  },
  beforeUnmount() {
    this.$emit("savePosition", this.scrollPosition);
  },
  methods: {
    onScroll: throttle(function () {
      /* eslint-disable no-invalid-this */
      const { scroller } = this.$refs;
      const { scrollTop, scrollHeight } = scroller;
      let containerHeight = scroller.getBoundingClientRect().height;

      // save scroll position
      this.scrollPosition = scrollTop;

      // the scroll distance measured from the bottom
      let scrollBottom = scrollHeight - scrollTop - containerHeight;

      // boundary is a 4th of the scrollHeight measured from the bottom
      let bottomBoundary = scrollHeight / 4; // eslint-disable-line no-magic-numbers

      if (
        scrollHeight > this.lastScrollHeight &&
        scrollBottom <= bottomBoundary
      ) {
        // make sure this event is emitted only once
        this.lastScrollHeight = scrollHeight;

        consola.debug("ScrollViewContainer: reached bottom boundary");
        this.$emit("scrollBottom");
      }
      /* eslint-enable no-invalid-this */
    }, SCROLL_HANDLER_THROTTLE),
  },
};
</script>

<template>
  <div ref="scroller" class="scroll-container" @scroll.passive="onScroll">
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
.scroll-container {
  overflow-x: hidden;
  text-align: left;
  height: 100%;
}
</style>
