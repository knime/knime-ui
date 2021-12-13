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
        ...mapGetters('userActions', ['mainMenuActionItems']),
        hasBreadcrumb() {
            return this.workflow?.parents?.length > 0;
        },
        visibleActionItems() {
            return this.mainMenuActionItems;
        }
    }
};
</script>

<template>
  <div class="toolbar">
    <transition-group
      tag="div"
      name="button-list"
    >
      <!-- TODO NXT-625: This is not how dispatch works. Only one parameter can be used as payload -->
      <div
        :key="visibleActionItems.map(action => action.title).join('-')"
        class="button-list"
      >
        <ToolbarButton
          v-for="a of visibleActionItems"
          :key="a.title"
          :class="{ 'with-text': a.text }"
          :disabled="a.disabled"
          :title="`${a.title} – ${a.hotkeyText}`"
          @click.native="$store.dispatch(a.storeAction, ...a.storeActionParams)"
        >
          <Component :is="a.icon" />
          {{ a.text }}
        </ToolbarButton>
      </div>
    </transition-group>

    <WorkflowBreadcrumb
      v-if="hasBreadcrumb"
      class="breadcrumb"
    />

    <ZoomMenu
      v-if="workflow"
      class="zoommenu"
    />
  </div>
</template>

<style lang="postcss" scoped>
.toolbar {
  display: flex;
  align-items: center;
  background: var(--knime-porcelain);
}

.button-list-leave-to,
.button-list-enter {
  opacity: 0;
}

.button-list-leave-active {
  position: absolute;
}

.button-list {
  transition: all 150ms ease-out;
  flex-shrink: 0;
  display: flex;
  font-size: 14px;
  user-select: none;

  & .with-text {
    padding-right: 9px;
    padding-left: 2px;
  }

  & button {
    transition: all 150ms ease-out;
  }
}

.breadcrumb {
  text-align: center;
  white-space: pre;
  flex: 1;
}
</style>
