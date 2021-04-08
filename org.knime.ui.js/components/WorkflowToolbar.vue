<script>
import { mapGetters, mapState, mapActions } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import ToolbarButton from '~/components/ToolbarButton';
import RedoIcon from '~/assets/redo.svg?inline';
import UndoIcon from '~/assets/undo.svg?inline';
import ZoomMenu from '~/components/ZoomMenu';

/**
 * A toolbar shown on top of a workflow canvas. Contains action buttons and breadcrumb.
 */
export default {
    components: {
        WorkflowBreadcrumb,
        ToolbarButton,
        UndoIcon,
        RedoIcon,
        ZoomMenu
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            allowedActions: state => state.activeWorkflow?.allowedActions || {}
        }),
        ...mapGetters('userActions', ['actionItems']),
        hasBreadcrumb() {
            return this.workflow.parents?.length > 0;
        },
        visibleActionItems() {
            return this.actionItems.filter(x => x.menuBar.visible);
        },
        // Checks if the application is run on a mac
        isMac() {
            return navigator.userAgent.toLowerCase().includes('mac');
        }
    },
    methods: {
        ...mapActions('workflow', ['undo', 'redo']),
        /**
         * Translates windows/linux shortcuts into mac shortcuts when operating system is mac
         * @param {String} shortcutTitle the windows/linux compatible shortcuts
         * @returns {String} the translated string
         */
        checkForMacShortcuts(shortcutTitle) {
            if (this.isMac) {
                shortcutTitle = shortcutTitle.replace('Shift +', '⇧');
                shortcutTitle = shortcutTitle.replace('– Delete', '– ⌫');
                return shortcutTitle.replace('Ctrl + ', '⌘ ');
            } else {
                return  shortcutTitle;
            }
        }
    }
};
</script>

<template>
  <div class="toolbar">
    <div class="buttons">
      <ToolbarButton
        :disabled="!allowedActions.canUndo"
        :title="checkForMacShortcuts('Undo – Ctrl + Z')"
        @click.native="undo"
      >
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton
        :disabled="!allowedActions.canRedo"
        :title="checkForMacShortcuts('Redo - Ctrl + Shift + Z')"
        @click.native="redo"
      >
        <RedoIcon />
      </ToolbarButton>
      <ToolbarButton
        v-for="(a, index) of visibleActionItems"
        :key="index"
        class="with-text"
        :disabled="a.menuBar.disabled"
        :title="checkForMacShortcuts(a.title)"
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
