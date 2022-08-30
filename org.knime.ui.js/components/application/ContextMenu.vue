<script>
import { mapGetters } from 'vuex';

import MenuItems from '@/webapps-common/ui/components/MenuItems.vue';
import FloatingMenu from '@/components/common/FloatingMenu.vue';

/**
 * ContextMenu offers actions for the Kanvas based on the selected nodes.
 */
export default {
    components: {
        FloatingMenu,
        MenuItems
    },
    props: {
        /**
         * Position of the menu in canvas coordinates.
         */
        position: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        }
    },
    data: () => ({
        visibleItems: []
    }),
    computed: {
        ...mapGetters('selection', ['selectedNodes', 'singleSelectedNode', 'selectedConnections']),

        // map visible items to menu items and add shortcut information
        menuItems() {
            return this.visibleItems
                .map(name => this.$shortcuts.get(name))
                .map(({ text, hotkeyText, name }) => ({
                    text,
                    hotkeyText,
                    name,
                    disabled: !this.$shortcuts.isEnabled(name)
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
                this.$nextTick(() => {
                    this.$refs.menuItems.$el.focus();
                });
            }
        }
    },
    methods: {
        onItemClick(event, shortcut) {
            this.$emit('menu-close');
            this.$shortcuts.dispatch(shortcut.name, event);
        },
        setMenuItems() {
            const somethingSelected = this.selectedNodes.length || this.selectedConnections.length;
            const isLoopEnd = Boolean(this.singleSelectedNode?.loopInfo?.allowedActions);
            const isView = this.singleSelectedNode && 'canOpenView' in this.singleSelectedNode.allowedActions;
            const hasLegacyFlowVariableDialog = this.singleSelectedNode &&
                'canOpenLegacyFlowVariableDialog' in this.singleSelectedNode.allowedActions;
            const isMetanodeOrComponent = ['metanode', 'component'].includes(this.singleSelectedNode?.kind);
            const isMetanode = this.singleSelectedNode?.kind === 'metanode';
            const isComponent = this.singleSelectedNode?.kind === 'component';

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

                // Copy & paste
                copy: somethingSelected,
                cut: somethingSelected,
                paste: !somethingSelected,

                // Workflow
                executeAll: !somethingSelected,
                cancelAll: !somethingSelected,
                resetAll: !somethingSelected,

                createMetanode: this.selectedNodes.length,
                createComponent: this.selectedNodes.length,
                expandMetanode: isMetanode,
                expandComponent: isComponent
            };

            // Array of name of shortcuts
            this.visibleItems = Object
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
    :canvas-position="position"
    aria-label="Context Menu"
    prevent-overflow
    @menu-close="$emit('menu-close')"
  >
    <MenuItems
      ref="menuItems"
      class="menu-items"
      :items="menuItems"
      aria-label="Context Menu"
      @item-click="onItemClick"
    />
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
.context-menu {
  min-width: 200px;
  max-width: 320px;
}

.menu-items {
  box-shadow: 0 1px 4px 0 var(--knime-gray-dark-semi);
}
</style>
