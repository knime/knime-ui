<script>
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
        hasBreadcrumb() {
            // TODO: show or hide NXT-288
            return true;
        }
    }
};
</script>

<template>
  <div class="content">
    <WorkflowBreadcrumb
      v-if="hasBreadcrumb"
      class="breadcrumb"
    />
    <Kanvas class="kanvas" />
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
  overflow: scroll;
}
</style>
