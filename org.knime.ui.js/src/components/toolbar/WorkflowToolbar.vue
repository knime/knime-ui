<script>
import { mapState, mapGetters } from 'vuex';

import WorkflowBreadcrumb from './WorkflowBreadcrumb.vue';
import ZoomMenu from './ZoomMenu.vue';
import ToolbarShortcutButton from './ToolbarShortcutButton.vue';
import ToolbarButton from './ToolbarButton.vue';

import { generateWorkflowPreview } from '@/util/generateWorkflowPreview';
/**
 * A toolbar shown on top of a workflow canvas. Contains action buttons and breadcrumb.
 */
export default {
    components: {
        WorkflowBreadcrumb,
        ZoomMenu,
        ToolbarShortcutButton,
        ToolbarButton
    },
    computed: {
        ...mapState('workflow', { workflow: 'activeWorkflow' }),
        ...mapState('application', ['activeProjectId']),
        ...mapState('canvas', ['getScrollContainerElement']),
        ...mapGetters('workflow', ['isWorkflowEmpty']),
        ...mapGetters('selection', ['selectedNodes']),
        ...mapGetters('application', ['getWorkflowPreviewSnapshot']),

        hasBreadcrumb() {
            return this.workflow?.parents?.length > 0;
        },
        toolbarButtons() {
            const isInsideComponent = this.workflow?.info.containerType === 'component';
          
            if (!this.workflow) {
                return [];
            }
            let visibleItems = {
                // Always visible
                save: true,
                undo: true,
                redo: true,

                // Workflow
                executeAll: !this.selectedNodes.length,
                cancelAll: !this.selectedNodes.length,
                resetAll: !this.selectedNodes.length,

                // Node execution
                executeSelected: this.selectedNodes.length,
                cancelSelected: this.selectedNodes.length,
                resetSelected: this.selectedNodes.length,

                // Workflow abstraction
                createMetanode: this.selectedNodes.length,
                createComponent: this.selectedNodes.length,
                openLayoutEditor: isInsideComponent
            };

            return Object
                .entries(visibleItems)
                .filter(([name, visible]) => visible)
                .map(([name, visible]) => name);
        }
    },
    methods: {
        async createSvgPreview() {
            console.clear();
            const isRootWorkflow = this.workflow.info.containerId === 'root';

            const svgElement = isRootWorkflow
                ? this.getScrollContainerElement().firstChild
                : this.getWorkflowPreviewSnapshot(this.activeProjectId);

            const output = await generateWorkflowPreview(svgElement);
            console.log(output);
        }
    }
};
</script>

<template>
  <div class="toolbar">
    <transition-group
      tag="div"
      name="button-list"
    >
      <!--
        setting :key="the list of all visible buttons",
        re-renders the whole list in a new div whenever buttons appear or disappear,
        such that those two lists can be faded
      -->
      <div
        :key="toolbarButtons.join()"
        class="button-list"
      >
        <ToolbarShortcutButton
          v-for="button in toolbarButtons"
          :key="button"
          :name="button"
        />
      </div>
    </transition-group>

    <ToolbarButton
      :class="['toolbar-button']"
      title="SVG Preview"
      @click.native="createSvgPreview"
    >
      svg preview
    </ToolbarButton>

    <WorkflowBreadcrumb
      v-if="hasBreadcrumb"
      class="breadcrumb"
    />

    <ZoomMenu
      v-if="workflow"
      :disabled="isWorkflowEmpty"
      class="zoommenu"
    />
  </div>
</template>

<style lang="postcss" scoped>
.toolbar {
  display: flex;
  align-items: center;
  background: var(--knime-porcelain);
}

.button-list-leave-to,
.button-list-enter {
  opacity: 0;
}

.button-list-leave-active {
  position: absolute;
}

.button-list {
  transition: opacity 150ms ease-out;
  flex-shrink: 0;
  display: flex;
  font-size: 14px;
  user-select: none;
}

.breadcrumb {
  text-align: center;
  white-space: pre;
  flex: 1;
}
</style>
