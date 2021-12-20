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
    computed: {
        ...mapGetters('userActions', ['contextMenuActionItems']),
        contextMenuItems() {
            return this.contextMenuActionItems.map(i => ({
                text: i.text,
                hotkeyText: i.hotkeyText,
                disabled: i.disabled,
                storeAction: i.storeAction,
                storeActionParams: i.storeActionParams
            }));
        }
    },
    methods: {
        onContextMenuItemClick(e, item, id) {
            // TODO NXT-625: This is not how dispatch works. Only one parameter can be used as payload
            this.$store.dispatch(item.storeAction, ...item.storeActionParams);
        },
        show(e) {
            this.$refs.contextMenu.showMenu(e.pageX, e.pageY);
        }
    }
};
</script>

<template>
  <FloatingMenu
    ref="contextMenu"
    class="context-menu"
    :items="contextMenuItems"
    aria-label="Context Menu"
    @item-click="onContextMenuItemClick"
  />
</template>

<style lang="postcss" scoped>
.context-menu {
  z-index: 5;
}
</style>
