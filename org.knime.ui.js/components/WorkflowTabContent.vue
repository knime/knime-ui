<script>
import { mapState } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import Kanvas from '~/components/Kanvas';
import LeftCollapsablePanel from '~/components/LeftCollapsablePanel';
import WorkflowMetadata from '~/components/WorkflowMetadata';


/**
 * A component that shows the tab contents belonging to one workflow,
 * i.e. toolbar, canvas, etc.
 */
export default {
    components: {
        Kanvas,
        LeftCollapsablePanel,
        WorkflowMetadata,
        WorkflowBreadcrumb
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
        hasBreadcrumb() {
            return this.workflow.parents && this.workflow.parents.length > 0;
        }
    }
};
</script>

<template>
  <main
    v-if="workflow"
  >
    <WorkflowBreadcrumb
      v-if="hasBreadcrumb"
      class="breadcrumb"
    />

    <LeftCollapsablePanel
      v-if="workflow.info.containerType === 'project'"
      id="metadata"
      width="360px"
      title="Workflow Metadata"
    >
      <WorkflowMetadata
        v-bind="workflow.metadata || placeholderMetadata"
      />
    </LeftCollapsablePanel>

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
  grid-template-rows: min-content auto;
  grid-template-areas:
    "toolbar toolbar"
    "metadata workflow";
}

#toolbar {
  grid-area: toolbar;

  /* border-top: 1px solid var(--header-separator); */
  height: 50px;
  background-color: var(--knime-porcelain);
  border-bottom: 1px solid var(--knime-silver-sand);
}

#metadata {
  grid-area: metadata;
  border-right: 1px solid var(--knime-silver-sand);
}

.breadcrumb {
  grid-area: toolbar;
  min-height: 50px;
  border-bottom: 1px solid var(--knime-silver-sand);
}

#kanvas {
  overflow: auto;
  grid-area: workflow;
}

.placeholder {
  grid-area: workflow;
  height: 55%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--knime-stone-gray);
}
</style>
