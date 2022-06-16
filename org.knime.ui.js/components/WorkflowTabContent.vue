<script>
import { mapState } from 'vuex';
import WorkflowPanel from '~/components/WorkflowPanel';
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
        WorkflowPanel
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        })
    }
};
</script>

<template>
  <main v-if="workflow">
    <Splitter
      id="kanvasOutputSplitter"
      direction="column"
    >
      <!-- TODO: NXT-844 this is a temporary component that can be merged with WorkflowTabContent as soon as
        WorkflowTabContent has been cleaned up -->
      <WorkflowPanel id="workflow-panel" />
      <template #secondary>
        <NodeOutput />
      </template>
    </Splitter>
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

.placeholder {
  height: 55%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--knime-stone-gray);
}
</style>
