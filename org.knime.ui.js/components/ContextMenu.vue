<script>
import { mapGetters } from 'vuex';
import FloatingMenu from '~/components/FloatingMenu';

/**
 * ContextMenu offers actions for the Kanvas based on the selected nodes.
 */
export default {
    components: {
        FloatingMenu
    },
    data: () => ({
        visibleCommands: []
    }),
    computed: {
        ...mapGetters('selection', ['selectedNodes', 'singleSelectedNode', 'selectedConnections']),
        // map visible command names to menu items
        menuItems() {
            return this.visibleCommands
                .map(name => this.$commands.get(name))
                .map(({ text, hotkeyText, name }) => ({
                    text,
                    hotkeyText,
                    name,
                    disabled: !this.$commands.isEnabled(name)
                }));
        }
    },
    methods: {
        show(e) {
            // Choose and fix menu items that are to be shown. Once the menu is open its items don't change
            this.setMenuItems();
            this.$refs.contextMenu.showMenu(e.clientX, e.clientY);
        },
        onContextMenuItemClick(e, command) {
            this.$commands.dispatch(command.name);
        },
        setMenuItems() {
            const somethingSelected = this.selectedNodes.length || this.selectedConnections.length;
            const isLoopEnd = Boolean(this.singleSelectedNode?.loopInfo?.allowedActions);
            const isView = this.singleSelectedNode && 'canOpenView' in this.singleSelectedNode.allowedActions;
            const hasLegacyFlowVariableDialog = this.singleSelectedNode &&
                'canOpenLegacyFlowVariableDialog' in this.singleSelectedNode.allowedActions;
            const isMetanodeOrComponent = ['metanode', 'component'].includes(this.visibleCommands?.kind);

            let allMenuItems = {
                // Exactly one node selected
                configureNode: this.singleSelectedNode,

                // Node Execution
                executeSelected: this.selectedNodes.length,
                resumeLoopExecution: isLoopEnd,
                pauseLoopExecution: isLoopEnd,
                stepLoopExecution: isLoopEnd,
                cancelSelected: this.selectedNodes.length,
                resetSelected: this.selectedNodes.length,

                configureFlowVariables: hasLegacyFlowVariableDialog,
                openView: isView,
                editName: isMetanodeOrComponent,

                // Something selected
                deleteSelected: somethingSelected,

                // Workflow
                executeAll: !somethingSelected,
                cancelAll: !somethingSelected,
                resetAll: !somethingSelected,

                createMetanode: this.selectedNodes.length
            };

            // Array of name of commands
            this.visibleCommands = Object
                .entries(allMenuItems)
                .filter(([name, visible]) => visible)
                .map(([name, visible]) => name);
        }
    }
};
</script>

<template>
  <FloatingMenu
    ref="contextMenu"
    class="context-menu"
    :items="menuItems"
    aria-label="Context Menu"
    @item-click="onContextMenuItemClick"
  />
</template>

<style lang="postcss" scoped>
.context-menu {
  z-index: 5;
}
</style>
