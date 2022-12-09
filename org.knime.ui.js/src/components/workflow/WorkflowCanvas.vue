<script>
import { mapGetters, mapMutations, mapActions, mapState } from 'vuex';
import { TABS } from '@/store/panel';
import Workflow from '@/components/workflow/Workflow.vue';
import Kanvas from '@/components/workflow/kanvas/Kanvas.vue';
import SelectionRectangle from '@/components/workflow/SelectionRectangle.vue';
import WorkflowEmpty from '@/components/workflow/WorkflowEmpty.vue';
import KanvasFilters from '@/components/workflow/kanvas/KanvasFilters.vue';

import { dropNode } from '@/mixins';

export default {
    components: {
        Workflow,
        Kanvas,
        SelectionRectangle,
        WorkflowEmpty,
        KanvasFilters
    },
    mixins: [dropNode],
    computed: {
        ...mapGetters('application', ['workflowCanvasState']),
        ...mapGetters('canvas', ['contentBounds']),
        ...mapGetters('workflow', ['isWorkflowEmpty']),
        ...mapState('nodeRepository', { isDraggingNodeFromRepository: 'isDraggingNode' }),
        ...mapState('canvas', ['zoomFactor']),
        ...mapState('application', ['activeProjectId']),
        ...mapState('workflow', ['activeWorkflow'])
    },
    watch: {
        isWorkflowEmpty: {
            immediate: true,
            async handler(isWorkflowEmpty) {
                // disable zoom & pan if workflow is empty
                this.setIsEmpty(isWorkflowEmpty);
                
                if (isWorkflowEmpty) {
                    // call to action: move nodes onto workflow
                    this.setActiveTab(TABS.NODE_REPOSITORY);
                    
                    // for an empty workflow "fillScreen" zooms to 100% and moves the origin (0,0) to the center
                    await this.$nextTick();
                    this.fillScreen();
                }
            }
        }
    },
    mounted() {
        if (this.isWorkflowEmpty) {
            this.setActiveTab(TABS.NODE_REPOSITORY);
        } else {
            this.setActiveTab(TABS.WORKFLOW_METADATA);
        }

        this.$nextTick(() => {
            // put canvas into fillScreen view after loading the workflow
            // if there isn't a saved canvas state for it
            if (!this.workflowCanvasState) {
                this.fillScreen();
            }
        });
    },
    methods: {
        ...mapMutations('canvas', ['setIsEmpty']),
        ...mapMutations('panel', ['setActiveTab']),
        ...mapActions('canvas', ['fillScreen']),
        ...mapActions('selection', ['deselectAllObjects']),
        onNodeSelectionPreview($event) {
            this.$refs.workflow.applyNodeSelectionPreview($event);
        },
        async onContainerSizeUpdated() {
            if (this.isWorkflowEmpty) {
                await this.$nextTick();
                
                // scroll to center
                this.fillScreen();
            }
        },
        onContextMenu(e) {
            // if event's default was prevented it means the behavior was already handled from the Node
            // otherwise we deselect all objects because it is a click on the canvas itself
            if (!e.defaultPrevented) {
                this.deselectAllObjects();
            }
        }
    }
};
</script>

<template>
  <Kanvas
    id="kanvas"
    ref="kanvas"
    :class="{ 'indicate-node-drag': isWorkflowEmpty && isDraggingNodeFromRepository }"
    @drop.native.stop="onDrop"
    @dragover.native.stop="onDragOver"
    @container-size-changed="onContainerSizeUpdated"
    @contextmenu="onContextMenu"
  >
    <!-- Includes shadows for Nodes -->
    <KanvasFilters />

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
  transition: background-color 150ms;
}

#kanvas.indicate-node-drag >>> svg {
  background-color: var(--knime-gray-ultra-light);
}

.workflow-sheet {
  fill: white;
  pointer-events: none;
}
</style>
