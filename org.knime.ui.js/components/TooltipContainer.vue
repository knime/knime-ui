<script>
import { mapState, mapGetters } from 'vuex';
import Tooltip from '~/components/Tooltip';

/**
 * A tooltip displaying text and an optional headline
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
        ...mapGetters('canvas', ['getAbsoluteCoordinates']),
        ...mapState('canvas', ['zoomFactor']),
        zoomedGap() {
            // The gap has to grow with the zoomFactor. Using the square root gives a more appropriate visual impression for larger factors
            return Math.sqrt(this.zoomFactor) * this.tooltip.gap;
        },
        positionOnCanvas() {
            if (!this.tooltip) { return null; }
            let { anchorPoint, position } = this.tooltip;

            // get coordinates relative to kanvas' bounds
            let { x, y } = this.getAbsoluteCoordinates({
                x: anchorPoint.x + position.x,
                y: anchorPoint.y + position.y
            });
            return { x, y };
        },
        position() {
            return {
                x: this.positionOnCanvas.x + this.canvasOffsetLeft - this.scrollOffsetLeft,
                y: this.positionOnCanvas.y + this.canvasOffsetTop - this.scrollOffsetTop
            };
        }
    },
    watch: {
        tooltip(newTooltip, oldTooltip) {
            if (!oldTooltip) {
                
                consola.trace('add kanvas scroll listener for tooltips');
                
                let kanvas = document.getElementById('kanvas');
                this.kanvasScroll = kanvas.addEventListener('scroll', ({ target }) => {
                    this.scrollOffsetLeft = target.scrollLeft;
                    this.scrollOffsetTop = target.scrollTop;
                });
                this.scrollOffsetLeft = kanvas.scrollLeft;
                this.scrollOffsetTop = kanvas.scrollTop;
                this.canvasOffsetLeft = kanvas.offsetLeft;
                this.canvasOffsetTop = kanvas.offsetTop;
            } else if (!newTooltip) {
                
                consola.trace('remove kanvas scroll listener for tooltips');

                let kanvas = document.getElementById('kanvas');
                kanvas.removeEventListener('scroll', this.kanvasScroll);
            }
        }
    },
    methods: {
        onMouseLeave() {
            this.$store.commit('workflow/setTooltip', null);
        }
    }
};
</script>

<template>
  <div class="tooltip-container">
    <transition name="tooltip">
      <Tooltip
        v-if="tooltip"
        v-bind="tooltip"
        :x="position.x"
        :y="position.y"
        :gap="zoomedGap"
        @mouseleave.native="onMouseLeave"
        @wheel.ctrl.native.prevent
      />
    </transition>
  </div>
</template>

<style lang="postcss" scoped>
.tooltip-container {
  position: fixed;
  top: 0;
  height: 0;

  & .tooltip-enter-active {
    /* delay entering of tooltip by 0.5 seconds */
    transition: opacity 150ms 0.5s ease;
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
