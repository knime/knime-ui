<script>
import { mixin as clickaway } from 'vue-clickaway2';
import MenuItems from '~/webapps-common/ui/components/MenuItems';

const SCROLLBAR_OFFSET = 4; // px

/*
 * The FloatingMenu component is a menu similar to the SubMenu.
 * If the menu wants to be closed it emits @menu-close event.
 * The menu will be closed on `esc` key press, click away or if an item has been selected.
 *
 * Example:
 * |--------------------|
 * | Menu Item       F9 |
 * | Another Item    F7 |
 * |--------------------|
 */

export default {
    components: {
        MenuItems
    },
    mixins: [clickaway],
    props: {
        /**
         * Items Array. See MenuItems.vue for more details.
         */
        items: {
            required: true,
            type: Array
        },
        /**
         * Absolute position of the Menu.
         */
        position: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        }
    },
    computed: {
        absolutePosition() {
            consola.trace('recalculating context menu position');

            const menuWidth = (this.$el?.offsetWidth || 0) + SCROLLBAR_OFFSET;
            const menuHeight = (this.$el?.offsetHeight || 0) + SCROLLBAR_OFFSET;

            let left, top;

            // ensure the menu is always visible within the window
            if ((window.innerWidth - this.position.x) < menuWidth) {
                left = window.innerWidth - menuWidth;
            } else {
                left = this.position.x;
            }

            // ensure the menu is always visible within the window
            if ((window.innerHeight - this.position.y) < menuHeight) {
                top = window.innerHeight - menuHeight;
            } else {
                top = this.position.y;
            }
            return { left, top };
        }
    },
    watch: {
        absolutePosition() {
            // set focus to menu for keyboard nav to work
            // also required to prevent menu from closing due to change of menu items change (see onFocusOut)
            this.$nextTick(() => this.$refs.menuItems.$el.focus());
        }
    },
    methods: {
        onItemClick(event, item) {
            // forward event and close menu
            this.$emit('item-click', event, item);
            this.closeMenu();
        },
        onFocusOut(e) {
            setTimeout(() => {
                if (!this.$el.contains(document.activeElement)) {
                    this.closeMenu();
                }
            }, 1);
        },
        closeMenu() {
            this.$emit('menu-close');
        }
    }
};
</script>

<template>
  <div
    v-on-clickaway="closeMenu"
    class="floating-menu"
    :style="{
      left: `${absolutePosition.left}px`,
      top: `${absolutePosition.top}px`
    }"
    @focusout.stop="onFocusOut"
    @keydown.esc.stop.prevent="closeMenu"
    @keydown.tab.stop.prevent
  >
    <MenuItems
      ref="menuItems"
      class="menu-items"
      :items="items"
      aria-label="Context Menu"
      @item-click="onItemClick"
    />
  </div>
</template>

<style lang="postcss" scoped>
.floating-menu {
  position: absolute;
  display: block;
  min-width: 200px;
  max-width: 320px;

  &:focus {
    outline: none;
  }
}
</style>
