<script>
import { mapActions, mapState, mapGetters } from 'vuex';

import Workflow from '~/components/workflow/Workflow';
import Kanvas from '~/components/Kanvas';

export default {
    components: {
        Workflow,
        Kanvas
    },
    computed: {
        ...mapState('canvas', ['zoomFactor', 'containerSize']),
        ...mapGetters('canvas', ['contentBounds']),
        ...mapGetters('canvas', ['canvasSize', 'viewBox', 'canvasPadding', 'fitToScreenZoomFactor']),
        ...mapGetters('workflow', ['workflowBounds'])
    },
    watch: {
        contentBounds(newBounds, oldBounds) {
            let [deltaX, deltaY] = [newBounds.left - oldBounds.left, newBounds.top - oldBounds.top];
            this.$refs.kanvas.$el.scrollLeft -= deltaX * this.zoomFactor;
            this.$refs.kanvas.$el.scrollTop -= deltaY * this.zoomFactor;
        }
    },
    mounted() {
        this.initialZoomAndPosition();
    },
    methods: {
        /*
          Selection
        */
        ...mapActions('selection', ['deselectAllObjects']),
        onEmptyPointerDown() {
            // remove selection
            this.deselectAllObjects();
        },
        initialZoomAndPosition() {
            let initialZoomFactor = Math.min(this.fitToScreenZoomFactor.max * 0.95, 1);
            
            this.$store.commit('canvas/setFactor', initialZoomFactor);

            let yAxisFits = this.fitToScreenZoomFactor.y >= initialZoomFactor;
            let xAxisFits = this.fitToScreenZoomFactor.x >= initialZoomFactor;
            
            let center = {
                x: this.contentBounds.left + this.contentBounds.width / 2,
                y: this.contentBounds.top + this.contentBounds.height / 2
            };

            // padded by 20px on screen
            let upperLeftCornerWithPadding = {
                x: this.contentBounds.left - 20 / this.zoomFactor,
                y: this.contentBounds.top - 20 / this.zoomFactor
            };

            this.$nextTick(() => {
                this.scrollTo({
                    x: xAxisFits ? center.x : upperLeftCornerWithPadding.x,
                    y: yAxisFits ? center.y : upperLeftCornerWithPadding.y,
                    centerX: xAxisFits,
                    centerY: yAxisFits
                });
            });
        },
        scrollTo({ x = 0, y = 0, centerX = false, centerY = false, smooth = false }) {
            console.log('scrollTo', arguments[0]);
            let kanvas = this.$refs.kanvas.$el;
            let screenCoordinates = this.$store.getters['canvas/fromWorkflowCoordinates']({ x, y });
            
            if (centerX) {
                screenCoordinates.x -= kanvas.clientWidth / 2;
            }
            if (centerY) {
                screenCoordinates.y -= kanvas.clientHeight / 2;
            }

            kanvas.scrollTo({
                left: screenCoordinates.x,
                top: screenCoordinates.y,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    }
};
</script>

<template>
  <Kanvas
    id="kanvas"
    ref="kanvas"
    @empty-pointerdown="onEmptyPointerDown"
  >
    <!-- Setting key to match exactly one workflow, causes knime-ui to re-render the whole component,
        instead of diffing old and new workflow -->
    <rect
      class="workflow-sheet"
      :x="contentBounds.left"
      :y="contentBounds.top"
      :width="contentBounds.right - contentBounds.left"
      :height="contentBounds.bottom - contentBounds.top"
      rx="8"
    />
    <Workflow />
  </Kanvas>
</template>

<style scoped>
#kanvas >>> svg {
  color: var(--knime-masala);
  background-color: white;
}

.workflow-sheet {
  fill: white;
  filter: drop-shadow(4px 4px 18px rgba(0,0,0, 0.1));
  pointer-events: none;
}
</style>
