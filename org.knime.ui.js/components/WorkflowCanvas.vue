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
        ...mapGetters('workflow', ['workflowBounds', 'uniqueId'])
    },
    mounted() {
        this.$nextTick(() => {
            if (!this.restoreState()) {
            this.$store.dispatch('canvas/zoomToFit');
            }
        });
    },
    beforeDestroy() {
        this.saveState();
        // save scoll position and zoom to store
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
        saveState() {
            let { scrollLeft, scrollTop } = this.$refs.kanvas.$el;

            this.$store.commit('openedProjects/saveState', {
                id: this.uniqueId,
                state: {
                    zoomFactor: this.zoomFactor,
                    scrollLeft,
                    scrollTop
                }
            });
        },
        restoreState() {
            let savedState = this.$store.state.openedProjects.savedState[this.uniqueId];
            if (!savedState) { return false; }
            
            let { scrollLeft, scrollTop, zoomFactor } = savedState;

            this.$store.commit('canvas/setFactor', zoomFactor);
            this.$refs.kanvas.$el.scrollLeft = scrollLeft;
            this.$refs.kanvas.$el.scrollTop = scrollTop;

            return true;
        }
    }
};
</script>

<template>
  <Kanvas
    id="kanvas"
    :key="uniqueId"
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
