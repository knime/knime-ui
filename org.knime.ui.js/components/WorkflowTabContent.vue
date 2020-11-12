<script>
import { mapState } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import Kanvas from '~/components/Kanvas';
import LeftCollapsiblePanel from '~/components/LeftCollapsiblePanel';
import WorkflowMetadata from '~/components/WorkflowMetadata';
import NodeOutput from '~/components/output/NodeOutput';


/**
 * A component that shows the tab contents belonging to one workflow,
 * i.e. toolbar, canvas, etc.
 */
export default {
    components: {
        NodeOutput,
        Kanvas,
        LeftCollapsiblePanel,
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
            return this.workflow.parents?.length > 0;
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

    <LeftCollapsiblePanel
      v-if="workflow.info.containerType === 'project'"
      id="metadata"
      width="360px"
      title="Workflow Metadata"
    >
      <WorkflowMetadata
        v-bind="workflow.metadata || placeholderMetadata"
      />
    </LeftCollapsiblePanel>

    <Kanvas id="kanvas" />
    <NodeOutput id="node-output" />
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
    "metadata kanvas"
    "metadata output";
}

#toolbar {
  grid-area: toolbar;
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
  grid-area: kanvas;
}

#node-output {
  overflow: auto;
  grid-area: output;
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
