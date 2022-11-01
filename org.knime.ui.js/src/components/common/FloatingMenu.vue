<script>
import { mapState, mapGetters } from 'vuex';
import throttle from 'raf-throttle';
import { mixin as clickaway } from 'vue-clickaway2';

import { escapeStack } from '@/mixins/escapeStack';
/*
 * The FloatingMenu component is a container that can be sticked to a position on the canvas,
 * but is shown on top of the whole application.
 *
 * For stickiness, it observes changes to its own size, and to scroll and zoom changes of the canvas
 *
 * If the menu wants to be closed it emits @menu-close event.
 * The menu will be closed on `esc` key press or on click away.
 *
 */

export default {
    mixins: [
        clickaway,
        escapeStack({
            onEscape() {
                this.$emit('menu-close');
            }
        })
    ],
    props: {
        /**
         * Whether the menu should be prevented from moving out of sight
         */
        preventOverflow: {
            type: Boolean,
            default: false
        },

        /**
         * Position of the target the floating menu is attached to in canvas coordinates
         */
        canvasPosition: {
            type: Object,
            required: true
        },

        /**
         * Which corner of the floating menu should stick to target position
         */
        anchor: {
            type: String,
            default: 'top-left',
            validator: (anchor) => ['top-left', 'top-right'].includes(anchor)
        }
    },
    data: () => ({
        absolutePosition: { left: 0, top: 0 }
    }),
    computed: {
        ...mapGetters('canvas', ['screenFromCanvasCoordinates']),
        ...mapState('canvas', ['zoomFactor'])
    },
    watch: {
        canvasPosition() {
            this.setAbsolutePosition();
        },
        zoomFactor() {
            this.setAbsolutePosition();
        }
    },
    mounted() {
        this.setAbsolutePosition();

        let kanvas = document.getElementById('kanvas');
        kanvas.addEventListener('scroll', this.onCanvasScroll);

        // set up resize observer
        this.resizeObserver = new ResizeObserver(entries => {
            this.setAbsolutePosition();
            consola.trace('floating menu: resize detected');
        });
        this.stopResizeObserver = () => {
            this.resizeObserver?.disconnect();
        };
        this.resizeObserver.observe(this.$el);
    },
    beforeDestroy() {
        // if kanvas currently exists (workflow is open) remove scroll event listener
        let kanvas = document.getElementById('kanvas');
        kanvas?.removeEventListener('scroll', this.onCanvasScroll);

        this.stopResizeObserver();
    },
    methods: {
        distanceToCanvas({ left, top }) {
            let kanvas = document.getElementById('kanvas');
            let { y, x, width, height } = kanvas.getBoundingClientRect();

            // find distance of point to all edges
            let leftDistance = x - left;
            let rightDistance = left - x - width;
            let topDistance = y - top;
            let bottomDistance = top - y - height;

            // find distance to closest horizontal edge, if outside canvas
            let distanceX = Math.max(Math.max(leftDistance, rightDistance), 0);

            // find distance to closest vertical edge, if outside canvas
            let distanceY = Math.max(Math.max(topDistance, bottomDistance), 0);

            // return greatest distance
            return Math.max(distanceX, distanceY);
        },
        setAbsolutePosition() {
            // get position relative to the window
            let { x: left, y: top } = this.screenFromCanvasCoordinates(this.canvasPosition);

            // if the target point is outside the canvas, first reduce opacity then close menu
            let distanceToCanvas = this.distanceToCanvas({ left, top });

            // linear fading depending on distance
            const distanceThreshold = 50;

            let alpha = Math.max(0, distanceThreshold - distanceToCanvas) / distanceThreshold;
            this.$el.style.opacity = alpha;

            // close menu if outside threshold
            if (distanceToCanvas > distanceThreshold) {
                this.$emit('menu-close');
                return;
            }

            const menuWidth = this.$el.offsetWidth;
            const menuHeight = this.$el.offsetHeight;

            if (this.anchor === 'top-right') {
                left -= menuWidth;
            }

            if (this.preventOverflow) {
                // ensure the menu is always visible within the window
                if ((window.innerWidth - left) < menuWidth) {
                    left = window.innerWidth - menuWidth;
                } else if (left < 0) {
                    left = 0;
                }

                // ensure the menu is always visible within the window
                if ((window.innerHeight - top) < menuHeight) {
                    top = window.innerHeight - menuHeight;
                } else if (top < 0) {
                    top = 0;
                }
            }

            this.absolutePosition = { left, top };
        },
        onFocusOut(e) {
            if (e.relatedTarget && !this.$el.contains(e.relatedTarget)) {
                this.$emit('menu-close');
            }
        },
        onCanvasScroll: throttle(function () {
            this.setAbsolutePosition(); // eslint-disable-line no-invalid-this
        })
    }
};
</script>

<template>
  <div
    v-on-clickaway="() => $emit('menu-close')"
    class="floating-menu"
    :style="{
      left: `${absolutePosition.left}px`,
      top: `${absolutePosition.top}px`
    }"
    @focusout.stop="onFocusOut"
    @keydown.tab.stop.prevent
  >
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
.floating-menu {
  position: absolute;
  display: block;
  z-index: 5;

  &:focus {
    outline: none;
  }
}
</style>
