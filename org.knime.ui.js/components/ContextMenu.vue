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
            top: 0,
            left: 0
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
        show(e) {
            this.$refs.contextMenu.showMenu(e.pageX, e.pageY);
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
    :top="top"
    :left="left"
    @item-click="onContextMenuItemClick"
  />
</template>

<style lang="postcss" scoped>
.contextMenu {
  z-index: 5;
}
</style>
