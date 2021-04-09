<script>
import { mapGetters } from 'vuex';
import FloatingMenu from '~/components/FloatingMenu';

/**
 * ContextMenu offers actions for the Kanvas based on the selected or hovered nodes
 */
export default {
    components: {
        FloatingMenu
    },
    data() {
        return {
            x: 0,
            y: 0
        };
    },
    computed: {
        ...mapGetters('userActions', ['actionItems']),
        contextMenuItems() {
            return this.actionItems.filter(i => i.contextMenu.visible).map(i => ({
                text: i.text,
                helpText: i.hotkeyText,
                disabled: i.contextMenu.disabled,
                storeAction: i.storeAction,
                storeActionParams: i.storeActionParams
            }));
        }
    },
    methods: {
        onContextMenuItemClick(e, item, id) {
            this.$store.dispatch(item.storeAction, ...item.storeActionParams);
        },
        /*
        clickEventHandler(e) {
            let button = e.which || e.button;
            if (button === 1) {
                this.$refs.contextMenu.closeMenu();
            }
        },
        */
        show(e) {
            this.x = e.pageX;
            this.y = e.pageY;
            // TODO: react to target
            //document.addEventListener('click', this.clickEventHandler);
            this.$refs.contextMenu.showMenu();
        }
    }
};
</script>

<template>
  <FloatingMenu
    ref="contextMenu"
    class="contextMenu"
    :items="contextMenuItems"
    aria-label="Context Menu"
    :x="x"
    :y="y"
    @item-click="onContextMenuItemClick"
  />
</template>

<style lang="postcss" scoped>
.contextMenu {
  z-index: 5;
}
</style>
