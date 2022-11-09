<script>
import { mapGetters } from 'vuex';

import MenuItems from 'webapps-common/ui/components/MenuItems.vue';
import FloatingMenu from '@/components/common/FloatingMenu.vue';

const menuGroups = function () {
    let currItems = [];

    const onlyVisible = ({ isVisible }) => isVisible;
                
    return {
        append(groupItems) {
            const newItems = groupItems.filter(onlyVisible);

            if (currItems.length !== 0 && newItems.length > 0) {
                // add separator to last item of previous group
                currItems[currItems.length - 1].separator = true;
            }
                        
            currItems = currItems.concat(newItems);

            // eslint-disable-next-line no-invalid-this
            return this;
        },

        value: () => currItems
    };
};

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
                .map((item) => {
                    const shortcut = this.$shortcuts.get(item.name);

                    if (!shortcut) {
                        return {
                            text: item.text || item.name,
                            separator: item.separator
                        };
                    }

                    return {
                        text: item.text || shortcut.text,
                        hotkeyText: shortcut.hotkeyText,
                        disabled: !this.$shortcuts.isEnabled(item.name),
                        separator: item.separator
                    };
                });
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
            const isMetanode = this.singleSelectedNode?.kind === 'metanode';
            const isComponent = this.singleSelectedNode?.kind === 'component';
            const isMetanodeOrComponent = isMetanode || isComponent;

            const basicOperationsGroup = [
                { name: 'configureNode', isVisible: this.singleSelectedNode },
                { name: 'executeSelected', isVisible: this.selectedNodes.length },
                // Loop nodes
                { name: 'resumeLoopExecution', isVisible: isLoopEnd },
                { name: 'pauseLoopExecution', isVisible: isLoopEnd },
                { name: 'stepLoopExecution', isVisible: isLoopEnd },
                { name: 'cancelSelected', isVisible: this.selectedNodes.length },
                { name: 'resetSelected', isVisible: this.selectedNodes.length },
                // misc
                { name: 'openView', isVisible: isView },
                { name: 'configureFlowVariables', isVisible: hasLegacyFlowVariableDialog },
                // no nodes selected
                { name: 'executeAll', isVisible: !somethingSelected },
                { name: 'cancelAll', isVisible: !somethingSelected },
                { name: 'resetAll', isVisible: !somethingSelected }
            ];

            const clipboardOperationsGroup = [
                { name: 'cut', isVisible: somethingSelected },
                { name: 'copy', isVisible: somethingSelected },
                { name: 'paste', isVisible: !somethingSelected },
                { name: 'deleteSelected', isVisible: somethingSelected }
            ];

            const metanodeOperationsGroup = [
                { name: 'createMetanode', isVisible: this.selectedNodes.length },
                { name: 'expandMetanode', isVisible: isMetanode },
                { name: 'editName', isVisible: isMetanodeOrComponent, text: 'Rename Metanode' },
                { name: 'createComponent', isVisible: this.selectedNodes.length }
            ];

            const componentOperationsGroup = [
                { name: 'createMetanode', isVisible: this.selectedNodes.length },
                { name: 'createComponent', isVisible: this.selectedNodes.length },
                { name: 'expandComponent', isVisible: isComponent },
                { name: 'editName', isVisible: isMetanodeOrComponent, text: 'Rename Component' }
            ];

            const items = menuGroups()
                .append(basicOperationsGroup)
                .append(clipboardOperationsGroup)
                .append(isMetanode ? metanodeOperationsGroup : componentOperationsGroup)
                .value();

            this.visibleItems = items;
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
