<script>
import { mapState, mapGetters } from 'vuex';
import Tooltip from '~/components/Tooltip';

/**
 * Controller for knime-ui tooltips
 * Reacts to changes on workflow/tooltip
 * Handles positioning, accounts for zoom & scroll
 * Closes tooltip when mouse leaves
 * Prevents native browser zooming by catching Ctrl-Wheel events
 */
export default {
    components: {
        Tooltip
    },
    data: () => ({
        scrollOffsetLeft: 0,
        scrollOffsetTop: 0,
        canvasOffsetLeft: 0,
        canvasOffsetTop: 0
    }),
    computed: {
        ...mapState('workflow', ['tooltip']),
        ...mapState('canvas', ['zoomFactor']),
        ...mapGetters('canvas', ['getAbsoluteCoordinates']),
        /*
            The gap has to grow with the zoomFactor.
            Using the square root gives a more appropriate visual impression for larger factors
        */
        zoomedGap() {
            return Math.sqrt(this.zoomFactor) * (this.tooltip.gap || 0);
        },
        positionOnCanvas() {
            if (!this.tooltip) { return null; }
            let { anchorPoint = { x: 0, y: 0 }, position } = this.tooltip;

            // get coordinates relative to kanvas' bounds
            let { x, y } = this.getAbsoluteCoordinates({
                x: anchorPoint.x + position.x,
                y: anchorPoint.y + position.y
            });
            return { x, y };
        },
        position() {
            // Account for scroll and canvas position
            return {
                x: this.positionOnCanvas.x + this.canvasOffsetLeft - this.scrollOffsetLeft,
                y: this.positionOnCanvas.y + this.canvasOffsetTop - this.scrollOffsetTop
            };
        }
    },
    watch: {
        tooltip(newTooltip, oldTooltip) {
            if (!oldTooltip) {
                this.openTooltip();
            } else if (!newTooltip) {
                this.closeTooltip();
            }
        }
    },
    beforeDestroy() {
        // clean up event listeners
        this.closeTooltip();
    },
    methods: {
        openTooltip() {
            consola.trace('add kanvas scroll listener for tooltips');
                
            let kanvas = document.getElementById('kanvas');
                
            // watch kanvas' scroll
            this.scrollOffsetLeft = kanvas.scrollLeft;
            this.scrollOffsetTop = kanvas.scrollTop;
            kanvas.addEventListener('scroll', this.onCanvasScroll);
                
            // use kanvas' offset (not watched)
            this.canvasOffsetLeft = kanvas.offsetLeft;
            this.canvasOffsetTop = kanvas.offsetTop;
        },
        closeTooltip() {
            consola.trace('remove kanvas scroll listener for tooltips');

            let kanvas = document.getElementById('kanvas');
            // if kanvas currently exsists (workflow is open) remove scroll event listener
            kanvas?.removeEventListener('scroll', this.onCanvasScroll);
        },
        onMouseLeave() {
            // trigger closing tooltip
            this.$store.commit('workflow/setTooltip', null);
        },
        onCanvasScroll({ target: kanvas }) {
            this.scrollOffsetLeft = kanvas.scrollLeft;
            this.scrollOffsetTop = kanvas.scrollTop;
        }
    }
};
</script>

<template>
  <div class="tooltip-container">
    <transition name="tooltip">
      <Tooltip
        v-if="tooltip"
        :x="position.x"
        :y="position.y"
        :gap="zoomedGap"
        :text="tooltip.text"
        :title="tooltip.title"
        :orientation="tooltip.orientation"
        :hoverable="tooltip.hoverable"
        :type="tooltip.type"
        @mouseleave.native="onMouseLeave"
        @wheel.ctrl.native.prevent
      />
    </transition>
  </div>
</template>

<style lang="postcss" scoped>
.tooltip-container {
  z-index: 2;
  position: fixed;
  top: 0;
  height: 0;

  & .tooltip-enter-active {
    /* delay entering of tooltip by 0.75 seconds */
    transition: opacity 150ms 0.75s ease;
  }

  & .tooltip-leave-active {
    transition: opacity 150ms ease;
  }

  & .tooltip-enter,
  & .tooltip-leave-to {
    opacity: 0;
  }
}
</style>
