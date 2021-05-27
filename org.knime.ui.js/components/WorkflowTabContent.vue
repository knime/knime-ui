<script>
import { mapState, mapGetters } from 'vuex';
import Kanvas from '~/components/Kanvas';
import LeftCollapsiblePanel from '~/components/LeftCollapsiblePanel';
import WorkflowMetadata from '~/components/WorkflowMetadata';
import NodeRepository from '~/components/NodeRepository';
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
        NodeRepository
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        ...mapGetters('panel', ['wfMetaActive', 'nodeRepoActive']),
        metadata() {
            switch (this.workflow.info.containerType) {
            case 'project':
                return this.workflow.projectMetadata || { title: this.workflow.info.name };
            case 'component': {
                const {
                    componentMetadata: { inPorts, outPorts, name, type, icon, description, options, views }
                } = this.workflow;
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
  <main v-if="workflow">
    <div class="collapser-kanvas">
      <LeftCollapsiblePanel
        id="metadata"
        width="360px"
        title="Workflow Metadata"
      >
        <NodeRepository v-if="nodeRepoActive" />
        <WorkflowMetadata
          v-else-if="metadata && wfMetaActive"
          v-bind="metadata"
        />
      </LeftCollapsiblePanel>
      <Splitter
        id="kanvasOutputSplitter"
        direction="column"
      >
        <Kanvas id="kanvas" />
        <template #secondary>
          <NodeOutput />
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
  flex: 1 0 60%;
}

.placeholder {
  height: 55%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--knime-stone-gray);
}
</style>
