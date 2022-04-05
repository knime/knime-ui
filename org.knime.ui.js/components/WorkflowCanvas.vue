<script>
import { mapGetters, mapMutations, mapActions, mapState } from 'vuex';

import Workflow from '~/components/workflow/Workflow';
import Kanvas from '~/components/Kanvas';
import SelectionRectangle from '~/components/SelectionRectangle';
import WorkflowEmpty from '~/components/workflow/WorkflowEmpty';

import { dropNode } from '~/mixins';

export default {
    components: {
        Workflow,
        Kanvas,
        SelectionRectangle,
        WorkflowEmpty
    },
    mixins: [dropNode],
    computed: {
        ...mapGetters('canvas', ['contentBounds']),
        ...mapGetters('workflow', ['isWorkflowEmpty']),
        ...mapState('nodeRepository', ['isDraggingNode'])
    },
    watch: {
        isWorkflowEmpty: {
            immediate: true,
            handler(isWorkflowEmpty) {
                this.setInteractionsEnabled(!isWorkflowEmpty);
            }
        }
    },
    mounted() {
        this.$nextTick(() => {
            this.$store.dispatch('canvas/fillScreen');
        });
    },
    methods: {
        ...mapMutations('canvas', ['setInteractionsEnabled']),
        ...mapActions('canvas', ['fillScreen']),
        onNodeSelectionPreview($event) {
            this.$refs.workflow.applyNodeSelectionPreview($event);
        },
        async onContainerSizeUpdated() {
            if (this.isWorkflowEmpty) {
                await this.$nextTick();
                await this.$nextTick();
                this.fillScreen();
            }
        }
    }
};
</script>

<template>
  <Kanvas
    id="kanvas"
    ref="kanvas"
    :class="{ 'kanvas-background': isDraggingNode && isWorkflowEmpty }"
    @drop.native.stop="onDrop"
    @dragover.native.stop="onDragOver"
    @container-size-updated="onContainerSizeUpdated"
  >
    <WorkflowEmpty v-if="isWorkflowEmpty" />

    <template v-else>
      <rect
        class="workflow-sheet"
        :x="contentBounds.left"
        :y="contentBounds.top"
        :width="contentBounds.width"
        :height="contentBounds.height"
      />

      <Workflow
        ref="workflow"
      />
    </template>

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
  pointer-events: none;
}
</style>
