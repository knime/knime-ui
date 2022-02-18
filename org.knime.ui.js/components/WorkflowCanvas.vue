<script>
import { mapGetters } from 'vuex';

import Workflow from '~/components/workflow/Workflow';
import Kanvas from '~/components/Kanvas';

export default {
    components: {
        Workflow,
        Kanvas
    },
    computed: {
        ...mapGetters('canvas', ['contentBounds'])
    },
    mounted() {
        this.$nextTick(() => {
            this.$store.dispatch('canvas/zoomToFit');
        });
    },
    methods: {
        // remove selection
        onEmptyPointerDown() {
            this.$store.dispatch('selection/deselectAllObjects');
        }
    }
};
</script>

<template>
  <Kanvas
    id="kanvas"
    @empty-pointerdown="onEmptyPointerDown"
  >
    <!-- Setting key to match exactly one workflow, causes knime-ui to re-render the whole component,
        instead of diffing old and new workflow -->
    <rect
      class="workflow-sheet"
      :x="contentBounds.left"
      :y="contentBounds.top"
      :width="contentBounds.width"
      :height="contentBounds.height"
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
