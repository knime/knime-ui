<script>
import { mapState } from 'vuex';
import WorkflowPanel from '~knime-ui/components/WorkflowPanel';
import NodeOutput from '~knime-ui/components/output/NodeOutput';
import Splitter from '~knime-ui/components/Splitter';
import SideMenu from '~knime-ui/components/SideMenu';

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
    <!-- TODO: NXT-844 why do we need this collapser-kanvas div? -->
    <div class="collapser-kanvas">
      <!-- TODO: NXT-844 move sidemenu out of WorkflowTabContent -->
      <!-- TODO: NXT-844 why are sidebar and sidemenu not combined in one component? -->
      <!-- TODO: NXT-844 should SideMenu really be only visible if workflow exists? Answer: no -->
      <SideMenu id="left-panel" />
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

.placeholder {
  height: 55%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--knime-stone-gray);
}
</style>
