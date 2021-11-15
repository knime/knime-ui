<script>
import { mapState } from 'vuex';
import WorkflowPanel from '~/components/WorkflowPanel';
import NodeOutput from '~/components/output/NodeOutput';
import Splitter from '~/components/Splitter';
import SideMenu from '~/components/SideMenu';

/**
 * A component that shows the tab contents belonging to one workflow,
 * i.e. toolbar, canvas, etc.
 */
export default {
    components: {
        Splitter,
        NodeOutput,
        WorkflowPanel,
        SideMenu
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
    <!-- TODO: why do we need this collapser-kanvas div? -->
    <div class="collapser-kanvas">
      <!-- TODO: move sidemenu out of WorkflowTabContent -->
      <!-- TODO: why are sidebar and sidemenu not combined in one component? -->
      <!-- TODO: should SideMenu really be only visible if workflow exists? Answer: no -->
      <SideMenu id="left-panel" />
      <Splitter
        id="kanvasOutputSplitter"
        direction="column"
      >
        <!-- TODO: this is a temporary component that can be merged with WorkflowTabContent as soon as WorkflowTabContent has been cleaned up -->
        <WorkflowPanel id="workflow-panel" />
        <template #secondary>
          <NodeOutput />
        </template>
      </Splitter>
    </div>
  </main>
  <!-- for semantic reasons: should this be inside of main? -->
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

.collapser-kanvas {
  display: flex;
  flex-grow: 1;
  flex-direction: row;
  align-items: stretch;
  overflow: hidden;
}

#left-panel {
  flex: 0 0 auto;
  border-right: 1px solid var(--knime-silver-sand);
}

.workflow-panel {
  /* TODO: why is this needed? */
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
