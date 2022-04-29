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
    props: {
        /**
         * Absolute position of the menu. It's relative to the next absolute/relative positioned parent.
         */
        position: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        }
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
    watch: {
        // set menu items on mounted,
        // update menu items when another target has been clicked, which is indicated by a change in position
        position: {
            immediate: true,
            handler() {
                this.setMenuItems();
            }
        }
    },
    methods: {
        onContextMenuItemClick(e, command) {
            this.$commands.dispatch(command.name);
        },
        setMenuItems() {
            const somethingSelected = this.selectedNodes.length || this.selectedConnections.length;
            const isLoopEnd = Boolean(this.singleSelectedNode?.loopInfo?.allowedActions);
            const isView = this.singleSelectedNode && 'canOpenView' in this.singleSelectedNode.allowedActions;
            const hasLegacyFlowVariableDialog = this.singleSelectedNode &&
                'canOpenLegacyFlowVariableDialog' in this.singleSelectedNode.allowedActions;
            const isMetanodeOrComponent = ['metanode', 'component'].includes(this.singleSelectedNode?.kind);

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
    class="context-menu"
    :items="menuItems"
    :position="position"
    aria-label="Context Menu"
    @item-click="onContextMenuItemClick"
    @menu-close="$emit('menu-close')"
  />
</template>

<style lang="postcss" scoped>
.context-menu {
  z-index: 5;
}
</style>
