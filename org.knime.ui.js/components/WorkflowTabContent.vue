<script>
import { mapState } from 'vuex';
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
        WorkflowMetadata
    },
    computed: {
        ...mapState('workflows', ['workflow']),
        placeholderMetadata() {
            return {
                title: this.workflow.info.name
            };
        }
    }
};
</script>

<template>
  <main>
    <div id="toolbar" />
    
    <LeftCollapsablePanel
      v-if="workflow"
      id="metadata"
      width="360px"
      title="Workflow Metadata"
    >
      <WorkflowMetadata
        v-bind="workflow.metadata || placeholderMetadata"
      />
    </LeftCollapsablePanel>
    
    <Kanvas
      v-if="workflow"
      id="kanvas"
    />
    <div
      v-else
      class="placeholder"
    >
      <h2>
        No workflow opened
      </h2>
    </div>
  </main>
</template>

<style lang="postcss" scoped>
main {
  grid-area: main;
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
  border-top: 1px solid var(--header-separator);
  height: 50px;
  background-color: var(--knime-porcelain);
  border-bottom: 1px solid var(--knime-silver-sand);
}

#metadata {
  grid-area: metadata;
  border-right: 1px solid var(--knime-silver-sand);
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
