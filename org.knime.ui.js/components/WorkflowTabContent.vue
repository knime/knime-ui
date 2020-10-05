<script>
import { mapState } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import Kanvas from '~/components/Kanvas';

/**
 * A component that shows the tab contents belonging to one workflow,
 * i.e. toolbar, canvas, etc.
 */
export default {
    components: {
        WorkflowBreadcrumb,
        Kanvas
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        hasBreadcrumb() {
            // TODO: show or hide NXT-288
            return true;
        }
    }
};
</script>

<template>
  <div class="content" v-if="workflow">
    <WorkflowBreadcrumb
      v-if="hasBreadcrumb"
      class="breadcrumb"
    />
    <Kanvas class="kanvas" />
  </div>
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
.content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.breadcrumb {
  min-height: 50px;
  border-bottom: 1px solid var(--knime-silver-sand);
  flex-shrink: 0;
}

.kanvas {
  flex-grow: 1;
  overflow: scroll;
}

.placeholder {
  height: 55%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--knime-stone-gray);
}
</style>
