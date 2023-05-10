<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapGetters } from 'vuex';

import type { MenuItem } from 'webapps-common/ui/components/MenuItems.vue';
import MenuItems from 'webapps-common/ui/components/MenuItems.vue';

import type { XY } from '@/api/gateway-api/generated-api';
import type { FormattedShortcut, ShortcutName } from '@/shortcuts';
import FloatingMenu from '@/components/common/FloatingMenu.vue';

type ContextMenuActionsGroupItem = {
    isVisible: boolean;
} & ({ name: ShortcutName, text?: string; children?: never } |
     { name?: never, text: string; children: Array<ContextMenuActionsGroupItem> });

type MenuItemWithName = Pick<FormattedShortcut, 'name'> & MenuItem

type ComponentData = {
    visibleItems: Array<ContextMenuActionsGroupItem & { separator?: boolean }>
}

// eslint-disable-next-line valid-jsdoc
/**
 * Helper fn that enables easily creating separators between the different context menu action groups
 */
const menuGroups = function () {
    let currItems: Array<ContextMenuActionsGroupItem & { separator?: boolean }> = [];

    const onlyVisible = ({ isVisible }) => isVisible;

    return {
        append(groupItems: Array<ContextMenuActionsGroupItem>) {
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
export default defineComponent({
    components: {
        FloatingMenu,
        MenuItems
    },
    props: {
        /**
         * Position of the menu in canvas coordinates.
         */
        position: {
            type: Object as PropType<XY>,
            required: true,
            validator: (position: Partial<XY>) => typeof position.x === 'number' && typeof position.y === 'number'
        }
    },
    emits: ['menuClose'],
    data: (): ComponentData => ({
        visibleItems: []
    }),
    computed: {
        ...mapGetters('selection', [
            'selectedNodes',
            'selectedAnnotations',
            'selectedConnections',
            'singleSelectedNode',
            'isSelectionEmpty'
        ]),

        // map visible items to menu items and add shortcut information
        menuItems(): Array<MenuItemWithName> {
            const contextToMenuItemMapping = (item) => {
                // special handling for sub menus
                if (item.children?.length) {
                    return {
                        name: null,
                        text: item.text,
                        separator: item.separator,
                        children: item.children.map(contextToMenuItemMapping)
                    };
                }

                const shortcut = this.$shortcuts.get(item.name);

                const shortcutText = typeof shortcut.text === 'function'
                    ? shortcut.text({ $store: this.$store })
                    : shortcut.text;

                return {
                    name: item.name,
                    text: item.text || shortcutText,
                    hotkeyText: shortcut.hotkeyText,
                    disabled: !this.$shortcuts.isEnabled(item.name),
                    separator: item.separator
                };
            };

            return this.visibleItems.map(contextToMenuItemMapping);
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
                    // eslint-disable-next-line no-extra-parens
                    (this.$refs.menuItems as { $el: HTMLElement }).$el.focus();
                });
            }
        }
    },
    beforeMount() {
        // deselect any selected text to make copy and paste of non text possible
        window?.getSelection().removeAllRanges();
    },
    methods: {
        onItemClick(event: MouseEvent, item: MenuItemWithName) {
            this.$emit('menuClose');
            // do nothing for submenu items
            if (item.name === null) {
                return;
            }
            this.$shortcuts.dispatch(item.name, {
                event,
                metadata: { position: this.position }
            });
        },
        setMenuItems() {
            const areNodesSelected = this.selectedNodes.length > 0;
            const areAnnotationsSelected = this.selectedAnnotations.length > 0;
            const areConnectionsSelected = this.selectedConnections.length > 0;
            const isAnythingSelected = areNodesSelected || areAnnotationsSelected || areConnectionsSelected;

            const isLoopEnd = Boolean(this.singleSelectedNode?.loopInfo?.allowedActions);
            const isView = this.singleSelectedNode && 'canOpenView' in this.singleSelectedNode.allowedActions;
            const hasLegacyFlowVariableDialog = this.singleSelectedNode &&
                'canOpenLegacyFlowVariableDialog' in this.singleSelectedNode.allowedActions;
            const isMetanode = this.singleSelectedNode?.kind === 'metanode';
            const isComponent = this.singleSelectedNode?.kind === 'component';
            const isMetanodeOrComponent = isMetanode || isComponent;

            const basicOperationsGroup: Array<ContextMenuActionsGroupItem> = [
                { name: 'configureNode', isVisible: this.singleSelectedNode },
                { name: 'executeSelected', isVisible: this.selectedNodes.length },
                // Loop nodes
                { name: 'resumeLoopExecution', isVisible: isLoopEnd },
                { name: 'pauseLoopExecution', isVisible: isLoopEnd },
                { name: 'stepLoopExecution', isVisible: isLoopEnd },
                { name: 'cancelSelected', isVisible: this.selectedNodes.length },
                { name: 'resetSelected', isVisible: this.selectedNodes.length },
                { name: 'editNodeLabel', isVisible: this.singleSelectedNode },
                // misc
                { name: 'executeAndOpenView', isVisible: isView },
                { name: 'configureFlowVariables', isVisible: hasLegacyFlowVariableDialog },
                // no nodes selected
                { name: 'executeAll', isVisible: this.isSelectionEmpty },
                { name: 'cancelAll', isVisible: this.isSelectionEmpty },
                { name: 'resetAll', isVisible: this.isSelectionEmpty }
            ];

            const clipboardOperationsGroup: Array<ContextMenuActionsGroupItem> = [
                { name: 'cut', isVisible: areNodesSelected || areAnnotationsSelected },
                { name: 'copy', isVisible: areNodesSelected || areAnnotationsSelected },
                { name: 'paste', isVisible: this.isSelectionEmpty },
                { name: 'deleteSelected', isVisible: !this.isSelectionEmpty }
            ];

            const arrangeAnnotationSubMenu: Array<ContextMenuActionsGroupItem> = [{
                text: 'Arrange annotations',
                isVisible: true,
                children: [
                    { name: 'addWorkflowAnnotation', isVisible: !isAnythingSelected },
                    { name: 'bringAnnotationToFront', isVisible: areAnnotationsSelected },
                    { name: 'bringAnnotationForward', isVisible: areAnnotationsSelected },
                    { name: 'sendAnnotationBackward', isVisible: areAnnotationsSelected },
                    { name: 'sendAnnotationToBack', isVisible: areAnnotationsSelected }
                ]
            }];

            const metanodeGroup: Array<ContextMenuActionsGroupItem> = [
                { name: 'createMetanode', isVisible: this.selectedNodes.length }
            ];

            const metanodeOperationsSubMenu: Array<ContextMenuActionsGroupItem> = [{
                text: 'Metanode',
                isVisible: true,
                children: [
                    { name: 'expandMetanode', isVisible: isMetanode },
                    { name: 'editName', isVisible: isMetanodeOrComponent }
                ]
            }];

            const componentGroup: Array<ContextMenuActionsGroupItem> = [
                { name: 'createComponent', isVisible: this.selectedNodes.length }
            ];

            const componentOperationsSubMenu: Array<ContextMenuActionsGroupItem> = [{
                text: 'Component',
                isVisible: true,
                children: [
                    { name: 'expandComponent', isVisible: isComponent },
                    { name: 'openComponent', isVisible: isComponent },
                    { name: 'editName', isVisible: isMetanodeOrComponent }
                ]
            }];

            this.visibleItems = menuGroups()
                .append(basicOperationsGroup)
                .append(clipboardOperationsGroup)
                .append(areAnnotationsSelected ? arrangeAnnotationSubMenu : [])
                .append(metanodeGroup.concat(isMetanode ? metanodeOperationsSubMenu : []))
                .append(componentGroup.concat(isComponent ? componentOperationsSubMenu : []))
                .value();
        }
    }
});
</script>

<template>
  <FloatingMenu
    :canvas-position="position"
    :disable-interactions="true"
    class="context-menu"
    aria-label="Context Menu"
    prevent-overflow
    @menu-close="$emit('menuClose')"
  >
    <MenuItems
      id="context-menu-items"
      ref="menuItems"
      class="menu-items"
      register-keydown
      :items="menuItems"
      menu-aria-label="Context Menu"
      @item-click="onItemClick"
    />
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
.context-menu {
  min-width: 200px;
  max-width: 320px;
}

.menu-items, :deep(.menu-items-sub-level) {
  box-shadow: 0 1px 4px 0 var(--knime-gray-dark-semi);
}

</style>
