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
        /*
        clickEventHandler(e) {
            let button = e.which || e.button;
            if (button === 1) {
                this.$refs.contextMenu.closeMenu();
            }
        },
        */
        calculateMenuPos(clickCoordsX, clickCoordsY) {
            const menu = this.$refs.contextMenu.$el;
            const menuWidth = menu.offsetWidth + 4;
            const menuHeight = menu.offsetHeight + 4;

            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            let left, top;

            if ((windowWidth - clickCoordsX) < menuWidth) {
                left = windowWidth - menuWidth;
            } else {
                left = clickCoordsX;
            }

            if ((windowHeight - clickCoordsY) < menuHeight) {
                top = windowHeight - menuHeight;
            } else {
                top = clickCoordsY;
            }
            return { left, top };
        },
        show(e) {
            const { left, top } = this.calculateMenuPos(e.pageX, e.pageY);
            this.left = left;
            this.top = top;
            // TODO: react to target
            // document.addEventListener('click', this.clickEventHandler);
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
