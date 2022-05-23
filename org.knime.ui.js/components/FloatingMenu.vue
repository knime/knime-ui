<script>
import { mixin as clickaway } from 'vue-clickaway2';

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
    mixins: [clickaway],
    props: {
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
    methods: {
        onFocusOut(e) {
            if (!this.$el.contains(e.relatedTarget)) {
                this.$emit('menu-close');
            }
        }
    }
};
</script>

<template>
  <div
    v-on-clickaway="() => $emit('menu-close')"
    class="floating-menu"
    :style="{
      left: `${absolutePosition.left}px`,
      top: `${absolutePosition.top}px`
    }"
    @focusout.stop="onFocusOut"
    @keydown.esc.stop.prevent="$emit('menu-close')"
    @keydown.tab.stop.prevent
  >
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
.floating-menu {
  position: absolute;
  display: block;
  z-index: 5;

  &:focus {
    outline: none;
  }
}
</style>
