<script>
import { mixin as clickaway } from 'vue-clickaway2';
import MenuItems from '~/webapps-common/ui/components/MenuItems';

const SCROLLBAR_OFFSET = 4; // px

/*
 * The FloatingMenu component is a menu similar to the SubMenu but with position logic to always be
 * visible at window borders and absolute top, left coordinates. The menu is hidden
 * if not activated with `showMenu(x, y)`.
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
         * Identifier for click handler
         */
        id: {
            default: '',
            type: String
        },
        ariaLabel: {
            type: String,
            default: 'menu'
        }
    },
    data() {
        return {
            isVisible: false,
            top: 0,
            left: 0
        };
    },
    computed: {
        positionStyle() {
            return this.isVisible ? { left: `${this.left}px`, top: `${this.top}px` } : null;
        }
    },
    methods: {
        onItemClick(event, item) {
            // forward event and close menu
            this.$emit('item-click', event, item, this.id);
            this.closeMenu();
        },
        closeMenu() {
            this.isVisible = false;
        },
        calculateMenuPosition(el, clickX, clickY, win = window) {
            const menuWidth = el.offsetWidth + SCROLLBAR_OFFSET;
            const menuHeight = el.offsetHeight + SCROLLBAR_OFFSET;

            const windowWidth = win.innerWidth;
            const windowHeight = win.innerHeight;

            let left, top;

            if ((windowWidth - clickX) < menuWidth) {
                left = windowWidth - menuWidth;
            } else {
                left = clickX;
            }

            if ((windowHeight - clickY) < menuHeight) {
                top = windowHeight - menuHeight;
            } else {
                top = clickY;
            }
            return { left, top };
        },
        showMenu(x, y) {
            const { left, top } = this.calculateMenuPosition(this.$el, x, y);
            this.left = left;
            this.top = top;
            this.isVisible = true;
            // set focus to menu for keyboard nav to work
            this.$nextTick(() => this.$refs.menuItems.$el.focus());
        },
        onFocusOut(e) {
            setTimeout(() => {
                if (!this.$el.contains(document.activeElement)) {
                    this.closeMenu();
                }
            }, 1);
        }
    }
};
</script>

<template>
  <div
    ref="floatingmenu"
    v-on-clickaway="closeMenu"
    :class="['floating-menu', { isVisible }]"
    :style="positionStyle"
    @focusout.stop="onFocusOut"
    @keydown.esc.stop.prevent="closeMenu"
    @keydown.tab.stop.prevent
  >
    <MenuItems
      :id="id"
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

  /* use visibility top/left negative and z-index to have a proper size which we need for position calculation */
  top: -1000px;
  left: -1000px;
  visibility: hidden;

  &.isVisible {
    visibility: visible;
  }

  &:focus {
    outline: none;
  }
}
</style>
