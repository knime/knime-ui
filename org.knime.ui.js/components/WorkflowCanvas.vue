<script>
import { mapGetters } from 'vuex';

import Workflow from '~/components/workflow/Workflow';
import Kanvas from '~/components/Kanvas';
import SelectionRectangle from '~/components/SelectionRectangle';

import { dropNode } from '~/mixins';

export default {
    components: {
        Workflow,
        Kanvas,
        SelectionRectangle
    },
    mixins: [dropNode],
    computed: {
        ...mapGetters('canvas', ['contentBounds'])
    },
    mounted() {
        this.$nextTick(() => {
            this.$store.dispatch('canvas/fillScreen');
        });
    },
    methods: {
        onNodeSelectionPreview($event) {
            this.$refs.workflow.applyNodeSelectionPreview($event);
        }
    }
};
</script>

<template>
  <Kanvas
    id="kanvas"
    ref="kanvas"
    @drop.native.stop="onDrop"
    @dragover.native.stop="onDragOver"
  >
    <rect
      class="workflow-sheet"
      :x="contentBounds.left"
      :y="contentBounds.top"
      :width="contentBounds.width"
      :height="contentBounds.height"
      rx="8"
    />

    <Workflow ref="workflow" />

    <!-- The SelectionRectangle registers to the selection-pointer{up,down,move} events of its parent (the Kanvas) -->
    <SelectionRectangle
      @node-selection-preview="onNodeSelectionPreview"
    />
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
