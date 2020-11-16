<script>
import { mapState } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
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
        WorkflowBreadcrumb
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        metadata() {
            switch (this.workflow.info.containerType) {
            case 'project':
                return this.workflow.projectMetadata || { title: this.workflow.info.name };
            case 'component':
                // eslint-disable-next-line no-case-declarations
                const { componentMetadata:
                    { inPorts, outPorts, name, type, icon, description, dialogs, views } } = this.workflow;
                return {
                    title: name,
                    description,
                    nodePreview: {
                        inPorts,
                        outPorts,
                        icon,
                        type,
                        isComponent: true,
                        hasDynPorts: false
                    },
                    nodeFeatures: {
                        inPorts,
                        outPorts,
                        views,
                        dialogs
                    },
                    isComponent: true
                };
            default:
                return null;
            }
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
      v-if="metadata"
      id="metadata"
      width="360px"
      title="Workflow Metadata"
    >
      <WorkflowMetadata
        v-bind="metadata"
      />
    </LeftCollapsiblePanel>

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
    "metadata kanvas";
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

.placeholder {
  grid-area: kanvas;
  height: 55%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--knime-stone-gray);
}
</style>
