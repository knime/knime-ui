<script>
import { mapState } from 'vuex';
import WorkflowToolbar from '~/components/WorkflowToolbar';
import Kanvas from '~/components/Kanvas';
import LeftCollapsiblePanel from '~/components/LeftCollapsiblePanel';
import WorkflowMetadata from '~/components/WorkflowMetadata';
import NodeOutput from '~/components/output/NodeOutput';
import Splitter from '~/components/Splitter';

/**
 * A component that shows the tab contents belonging to one workflow,
 * i.e. toolbar, canvas, etc.
 */
export default {
    components: {
        Splitter,
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
        metadata() {
            switch (this.workflow.info.containerType) {
            case 'project':
                return this.workflow.projectMetadata || { title: this.workflow.info.name };
            case 'component': {
                const { componentMetadata:
                    { inPorts, outPorts, name, type, icon, description, options, views } } = this.workflow;
                return {
                    title: name,
                    description,
                    nodePreview: { inPorts, outPorts, icon, type, isComponent: true, hasDynPorts: false },
                    nodeFeatures: { inPorts, outPorts, views, options },
                    isComponent: true
                };
            }
            default:
                return null;
            }
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
        v-if="metadata"
        id="metadata"
        width="360px"
        title="Workflow Metadata"
      >
        <WorkflowMetadata
          v-bind="metadata"
        />
      </LeftCollapsiblePanel>
      <Splitter
        id="kanvasOutputSplitter"
        direction="column"
      >
        <Kanvas id="kanvas" />
        <template v-slot:secondary>
          <NodeOutput id="node-output" />
        </template>
      </Splitter>
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
  flex: 1 1 100%;
  height: 100%;
}

#node-output {
  flex: 1 1 100%;
}

.placeholder {
  height: 55%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--knime-stone-gray);
}
</style>
