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
            const scrollPosition = this.$refs.scroller.scrollTop;
            const scrollHeight = this.$refs.scroller.scrollHeight;
            const viewHeight = this.$refs.scroller.getBoundingClientRect().height;
            this.scrollPosition = scrollPosition;
            if (scrollHeight - scrollPosition - viewHeight <= 0) {
                this.$emit('scroll-bottom');
            }
        }, SCROLL_HANDLER_THROTTLE)
    }
    
};
</script>

<template>
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
