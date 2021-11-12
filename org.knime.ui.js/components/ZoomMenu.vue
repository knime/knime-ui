<script>
import { mapGetters, mapState } from 'vuex';
import DropdownIcon from '~/webapps-common/ui/assets/img/icons/arrow-dropdown.svg?inline';
import SubMenu from '~/webapps-common/ui/components/SubMenu';

/**
 * ZoomMenu offers predefined zoom levels and an input field to enter custom zoom levels
 */
export default {
    components: {
        DropdownIcon,
        SubMenu
    },
    computed: {
        ...mapState('canvas', ['zoomFactor']),
        ...mapGetters('canvas', ['fitToScreenZoomFactor']),
        ...mapGetters('userActions', ['zoomActionItems']),

        zoomInputValue() {
            return `${Math.round(this.zoomFactor * 100)}%`;
        }
    },
    methods: {
        onZoomInputEnter(e) {
            // '100' or '100%' works
            let newZoomFactor = parseInt(e.target.value, 10) / 100;

            if (!isNaN(newZoomFactor)) {
                this.$store.commit('canvas/setFactor', newZoomFactor);
            }

            // de-focus input. Resets and formats zoom level
            e.target.blur();
            e.target.value = this.zoomInputValue;
        },
        onZoomInputClick(e) {
            e.target.focus();
            e.target.select();
        },
        onZoomInputFocusOut(e) {
            // Deselect text and reset to formatted value
            e.target.blur();
            e.target.value = this.zoomInputValue;
        },
        onZoomItemClick(e, item, id) {
            // TODO NXT-625: This is not how dispatch works. Only one parameter can be used as payload
            this.$store.dispatch(item.storeAction, ...item.storeActionParams);
            this.$refs.zoomInput.blur();
        },
        onWheel(e) {
            const delta = e.deltaY < 0 ? 1 : -1;
            this.$store.dispatch('canvas/zoomCentered', delta);
        }
    }
};
</script>

<template>
  <SubMenu
    ref="subMenu"
    class="zoom"
    :items="zoomActionItems"
    @item-click="onZoomItemClick"
  >
    <input
      ref="zoomInput"
      type="text"
      :value="zoomInputValue"
      class="zoom-input"
      @click.stop="onZoomInputClick"
      @keydown.enter.stop.prevent="onZoomInputEnter"
      @keydown.down="$refs.subMenu.expanded = true"
      @wheel.prevent="onWheel"
      @focusout.stop="onZoomInputFocusOut"
    >
    <DropdownIcon />
  </SubMenu>
</template>

<style lang="postcss" scoped>
.zoom {
  margin-left: auto;
  z-index: 5;

  & >>> .submenu-toggle {
    padding: 0 13px 0 0;
    align-items: center;

    & svg {
      height: 12px;
      width: 12px;
      stroke-width: calc(32px / 12);
      margin-bottom: 1px;
    }

    &.expanded svg {
      transform: scaleY(-1);
    }

    & .zoom-input {
      background: transparent;
      border: none;
      width: 54px;
      padding: 8px 4px 8px 16px;
      font-size: 14px;
      font-weight: 400;
      margin-right: 0;

      &:focus {
        outline: none;
      }
    }

    &.expanded .zoom-input {
      color: var(--theme-button-function-foreground-color-active);
    }
  }
}
</style>
