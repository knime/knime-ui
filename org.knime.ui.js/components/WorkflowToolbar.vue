<script>
import { mapGetters, mapState } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import ToolbarButton from '~/components/ToolbarButton';
import ZoomMenu from '~/components/ZoomMenu';

/**
 * A toolbar shown on top of a workflow canvas. Contains action buttons and breadcrumb.
 */
export default {
    components: {
        WorkflowBreadcrumb,
        ToolbarButton,
        ZoomMenu
    },
    computed: {
        ...mapState('workflow', { workflow: 'activeWorkflow' }),
        ...mapGetters('userActions', ['actionItems']),
        hasBreadcrumb() {
            return this.workflow.parents?.length > 0;
        },
        visibleActionItems() {
            return this.actionItems.filter(x => x.menuBar.visible);
        }
    }
};
</script>

<template>
  <div class="toolbar">
    <div class="buttons">
      <ToolbarButton
        v-for="(a, index) of visibleActionItems"
        :key="index"
        :class="a.text ? 'with-text' : ''"
        :disabled="a.menuBar.disabled"
        :title="a.title"
        @click.native="$store.dispatch(a.storeAction, ...a.storeActionParams)"
      >
        <Component :is="a.icon" />
        {{ a.text }}
      </ToolbarButton>
    </div>

    <WorkflowBreadcrumb
      v-if="hasBreadcrumb"
      class="breadcrumb"
    />

    <ZoomMenu class="zoommenu" />
  </div>
</template>

<style lang="postcss" scoped>
.toolbar {
  display: flex;
  align-items: center;
  background: var(--knime-porcelain);
}

.buttons {
  flex-shrink: 0;
  display: flex;
  font-size: 14px;

  & .with-text {
    padding-right: 9px;
    padding-left: 2px;
  }
}

.breadcrumb {
  text-align: center;
  white-space: pre;
  flex: 1;
}
</style>
