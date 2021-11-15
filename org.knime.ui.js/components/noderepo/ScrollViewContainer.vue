<script>
import { throttle } from 'lodash';

const SCROLL_HANDLER_THROTTLE = 100;

export default {
    props: {
        initialPosition: {
            type: Number,
            default: 0
        }
    },
    data() {
        return {
            scrollPosition: this.initialPosition
        };
    },
    mounted() {
        if (this.$refs.scroller) {
            this.$nextTick(() => {
                this.$refs.scroller.scrollTop = this.initialPosition;
            });
        }
    },
    beforeDestroy() {
        this.$emit('save-position', this.scrollPosition);
    },
    methods: {
        onScroll: throttle(function () {
            /* eslint-disable no-invalid-this */
            const scroller = this.$refs.scroller;
            const { scrollTop, scrollHeight } = scroller;
            const viewHeight = scroller.getBoundingClientRect().height;
            this.scrollPosition = scrollTop;
            if (scrollHeight - scrollTop - viewHeight <= (viewHeight / 2)) {
                this.$emit('scroll-bottom');
            }
            /* eslint-enable no-invalid-this */
        }, SCROLL_HANDLER_THROTTLE)
    }
};
</script>

<template>
  <!-- TODO: NXT-803 use passive scroll listener for performance reasons -->
  <div
    ref="scroller"
    class="scroll-container"
    @scroll="onScroll"
  >
    <slot />
  </div>
</template>

<style lang="postcss" scoped>

.scroll-container {
  background-color: var(--knime-gray-ultra-light);
  overflow-x: hidden;
  text-align: left;
  height: 100%;
}
</style>
