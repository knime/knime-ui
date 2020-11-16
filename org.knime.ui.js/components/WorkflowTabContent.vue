<script>
import { mapState } from 'vuex';
import WorkflowToolbar from '~/components/WorkflowToolbar';
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
  >
    <WorkflowToolbar
      id="toolbar"
    />
    <div class="collapser-kanvas">
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
      <Kanvas id="kanvas" />
      <NodeOutput id="node-output" />
    </div>
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
  display: flex;
  overflow: auto;
  flex-direction: column;
  align-items: stretch;
  height: 100%;
}

#toolbar {
  height: 50px;
  flex: 0 0 auto;
  padding: 10px;
  background-color: var(--knime-porcelain);
  border-bottom: 1px solid var(--knime-silver-sand);
}

.collapser-kanvas {
  display: flex;
  flex-grow: 1;
  flex-direction: row;
  align-items: stretch;
  overflow: hidden;
}

#metadata {
  flex: 0 0 auto;
  border-right: 1px solid var(--knime-silver-sand);
}

#kanvas {
  overflow: auto;
  flex: 1 1 auto;
}

#node-output {
  overflow: auto;
  grid-area: output;
}

.placeholder {
  height: 55%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--knime-stone-gray);
}
</style>
