<script>
import { mapGetters, mapMutations, mapActions, mapState } from 'vuex';

import Workflow from '~/components/workflow/Workflow';
import Kanvas from '~/components/Kanvas';
import SelectionRectangle from '~/components/SelectionRectangle';
import WorkflowEmpty from '~/components/workflow/WorkflowEmpty';
import KanvasFilters from '~/components/workflow/KanvasFilters';

import { dropNode } from '~/mixins';

export default {
    components: {
        Workflow,
        Kanvas,
        SelectionRectangle,
        WorkflowEmpty,
        KanvasFilters
    },
    mixins: [dropNode],
    data() {
        return {
            scrollTop: 0,
            scrollLeft: 0,
            activeWorkflow: '',
            activeProject: ''
        };
    },
    computed: {
        ...mapGetters('canvas', ['contentBounds']),
        ...mapGetters('workflow', ['isWorkflowEmpty', 'activeWorkflowId']),
        ...mapState('nodeRepository', { isDraggingNodeFromRepository: 'isDraggingNode' }),
        ...mapState('canvas', ['zoomFactor']),
        ...mapState('application', ['activeProjectId'])
    },
    watch: {
        isWorkflowEmpty: {
            immediate: true,
            async handler(isWorkflowEmpty) {
                // disable zoom & pan if workflow is empty
                this.setInteractionsEnabled(!isWorkflowEmpty);
                
                if (isWorkflowEmpty) {
                    // call to action: move nodes onto workflow
                    this.setNodeRepositoryActive();
                    
                    // for an empty workflow "fillScreen" zooms to 100% and moves the origin (0,0) to the center
                    await this.$nextTick();
                    this.fillScreen();
                }
            }
        }
    },
    beforeDestroy() {
        const savedState = {
            zoomFactor: this.zoomFactor,
            scrollTop: this.scrollTop,
            scrollLeft: this.scrollLeft,
            workflow: this.activeWorkflow,
            project: this.activeProject
        };

        this.setSavedStates(savedState);
    },
    mounted() {
        this.activeWorkflow = this.activeWorkflowId;
        this.activeProject = this.activeProjectId;

        if (this.isWorkflowEmpty) {
            this.setNodeRepositoryActive();
        } else {
            this.setWorkflowMetaActive();
        }

        this.$nextTick(() => {
            // put canvas into fillScreen view after loading the workflow
            // TODO: To be changed in NXT-929
            this.fillScreen();
        });
    },
    methods: {
        ...mapMutations('canvas', ['setInteractionsEnabled']),
        ...mapMutations('application', ['setSavedStates']),
        ...mapActions('canvas', ['fillScreen']),
        ...mapActions('panel', ['setNodeRepositoryActive', 'setWorkflowMetaActive']),
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
        },
        handleScroll(e) {
            this.scrollTop = e.target.scrollTop;
            this.scrollLeft = e.target.scrollLeft;
        }
    }
};
</script>

<template>
  <Kanvas
    id="kanvas"
    ref="kanvas"
    :class="{ 'indicate-node-drag': isWorkflowEmpty && isDraggingNodeFromRepository }"
    @scroll.native.passive="handleScroll"
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
