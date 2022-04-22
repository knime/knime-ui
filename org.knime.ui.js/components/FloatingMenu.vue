<script>
import { mixin as clickaway } from 'vue-clickaway2';
import MenuItems from '~/webapps-common/ui/components/MenuItems';

const SCROLLBAR_OFFSET = 4; // px

/*
 * The FloatingMenu component is a menu similar to the SubMenu but with position logic to always be
 * visible at window borders and absolute top, left coordinates.
 * The menu is hidden unless the isVisible prop is true. If the menu will be closed it emits @menu-close event. The
 * parent component needs to make sure the isVisible prop gets updated. Menu will be closed on `esc` key press,
 * click away or if an item has been selected.
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
        },
        isVisible: {
            type: Boolean,
            default: false
        },
        position: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        }
    },
    data() {
        return {
            absolutePosition: {
                top: 0,
                left: 0
            }
        };
    },
    computed: {
        positionStyle() {
            return this.isVisible
                ? { left: `${this.absolutePosition.left}px`, top: `${this.absolutePosition.top}px` }
                : null;
        }
    },
    watch: {
        position() {
            this.updatePosition();
        },
        isVisible: {
            immediate: true,
            handler(newValue) {
                if (newValue === true) {
                    this.updatePosition();
                }
            }
        }
    },
    methods: {
        onItemClick(event, item) {
            // forward event and close menu
            this.$emit('item-click', event, item, this.id);
            this.closeMenu();
        },
        closeMenu() {
            this.$emit('menu-close');
        },
        updatePosition() {
            this.absolutePosition = this.calculateMenuPosition(this.$el, this.position.x, this.position.y);
            // set focus to menu for keyboard nav to work
            // also required to prevent menu from closing due to change of menu items change (see onFocusOut)
            this.$nextTick(() => this.$refs.menuItems.$el.focus());
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
