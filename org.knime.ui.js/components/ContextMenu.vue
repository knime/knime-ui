<script>
import { mapGetters, mapActions } from 'vuex';
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
        ...mapGetters('canvas', ['toCanvasCoordinates']),
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
        ...mapActions('selection', ['deselectAllObjects']),
        show(e) {
            const positionOnCanvas = this.positionOnCanvas(e);
            const clickPosition = { x: positionOnCanvas.x, y: positionOnCanvas.y };

            const isClickingOverSelectedNode = this.selectedNodes.some(
                ({ position }) => this.isClickOverNode({ nodePosition: position, clickPosition })
            );

            if (!isClickingOverSelectedNode) {
                this.deselectAllObjects();
            }
            
            // Choose and fix menu items that are to be shown. Once the menu is open its items don't change
            this.setMenuItems();
            this.$refs.contextMenu.showMenu(e.clientX, e.clientY);
        },
        onContextMenuItemClick(e, command) {
            this.$commands.dispatch(command.name);
        },
        positionOnCanvas({ clientX, clientY }) {
            const kanvasElement = document.getElementById('kanvas');
            const { offsetLeft, offsetTop, scrollLeft, scrollTop } = kanvasElement;

            const offsetX = clientX - offsetLeft + scrollLeft;
            const offsetY = clientY - offsetTop + scrollTop;

            // convert to kanvas coordinates
            const [x, y] = this.toCanvasCoordinates([offsetX, offsetY]);
            return { x, y };
        },
        isClickOverNode({ nodePosition, clickPosition }) {
            const { nodeSize } = this.$shapes;
            const [top, left, bottom, right] = this.$shapes.nodeHoverMargin;

            const isTopInside = nodePosition.y - top <= clickPosition.y;
            const isLeftInside = nodePosition.x - left <= clickPosition.x;
            const isBottomInside = nodePosition.y + nodeSize + bottom >= clickPosition.y;
            const isRightInside = nodePosition.x + nodeSize + right >= clickPosition.x;

            return isTopInside && isLeftInside && isBottomInside && isRightInside;
        },
        setMenuItems() {
            const somethingSelected = this.selectedNodes.length || this.selectedConnections.length;
            const isLoopEnd = Boolean(this.singleSelectedNode?.loopInfo?.allowedActions);
            const isView = this.singleSelectedNode && 'canOpenView' in this.singleSelectedNode.allowedActions;
            const hasLegacyFlowVariableDialog = this.singleSelectedNode &&
                'canOpenLegacyFlowVariableDialog' in this.singleSelectedNode.allowedActions;

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
                
                // Something selected
                deleteSelected: somethingSelected,

                // Workflow
                executeAll: !somethingSelected,
                cancelAll: !somethingSelected,
                resetAll: !somethingSelected
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
