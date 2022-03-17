<script>
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
            this.$refs.contextMenu.showMenu(e.pageX, e.pageY);
        },
        onContextMenuItemClick(e, command) {
            this.$commands.dispatch(command.name);
        },
        setMenuItems() {
            const selectedNodes = this.$store.getters['selection/selectedNodes'];
            const singleSelectedNode = this.$store.getters['selection/singleSelectedNode'];
            const selectedConnections = this.$store.getters['selection/selectedConnections'];
            
            const somethingSelected = selectedNodes.length || selectedConnections.length;
            const isLoopEnd = Boolean(singleSelectedNode?.loopInfo?.allowedActions);
            const isView = singleSelectedNode && 'canOpenView' in singleSelectedNode.allowedActions;

            let allMenuItems = {
                // Node Execution
                executeSelected: selectedNodes.length,
                resumeLoopExecution: isLoopEnd,
                pauseLoopExecution: isLoopEnd,
                stepLoopExecution: isLoopEnd,
                cancelSelected: selectedNodes.length,
                resetSelected: selectedNodes.length,

                // Exactly one node selected
                configureNode: singleSelectedNode,
                openView: isView,
                
                // Something selected
                deleteSelected: somethingSelected,

                // Workflow
                executeAll: !somethingSelected,
                cancelAll: !somethingSelected,
                resetAll: !somethingSelected,

                createMetanode: selectedNodes.length
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
