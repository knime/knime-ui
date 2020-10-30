<script>
import { mapState } from 'vuex';
import WorkflowToolbar from '~/components/Workflowtoolbar';
import Kanvas from '~/components/Kanvas';
import LeftCollapsiblePanel from '~/components/LeftCollapsiblePanel';
import WorkflowMetadata from '~/components/WorkflowMetadata';


/**
 * A component that shows the tab contents belonging to one workflow,
 * i.e. toolbar, canvas, etc.
 */
export default {
    components: {
        Kanvas,
        LeftCollapsiblePanel,
        WorkflowMetadata,
        WorkflowToolbar
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        placeholderMetadata() {
            return {
                title: this.workflow.info.name
            };
        },
        hasLeftPanel() {
            return this.workflow.info.containerType === 'project';
        }
    }
};
</script>

<template>
  <main
    v-if="workflow"
    :class="{ hasLeftPanel }"
  >
    <LeftCollapsiblePanel
      v-if="hasLeftPanel"
      id="metadata"
      width="360px"
      title="Workflow Metadata"
    >
      <WorkflowMetadata
        v-bind="workflow.metadata || placeholderMetadata"
      />
    </LeftCollapsiblePanel>

    <WorkflowToolbar
      id="toolbar"
    />
    <Kanvas id="kanvas" />
  </main>
  <div
    v-else
    class="placeholder"
  >
    <h2>
      No workflow opened
    </h2>
  </div>
</template>

<style lang="postcss" scoped>
main {
  display: grid;
  overflow: auto;
  grid-template-columns: min-content auto;
  grid-template-rows: 50px auto;
  grid-template-areas:
    "metadata toolbar"
    "metadata kanvas";
}

#toolbar {
  grid-area: toolbar;
  padding-left: 10px;
  background-color: var(--knime-porcelain);
  border-bottom: 1px solid var(--knime-silver-sand);
}

main.hasLeftPanel #toolbar {
  margin-left: -11px;
}

#metadata {
  grid-area: metadata;
  border-right: 1px solid var(--knime-silver-sand);
}

#kanvas {
  overflow: auto;
  grid-area: kanvas;
}

.placeholder {
  grid-area: kanvas;
  height: 55%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--knime-stone-gray);
}
</style>
