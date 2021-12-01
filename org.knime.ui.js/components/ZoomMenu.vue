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
        ...mapGetters('userActions', ['zoomActionItems'])
    },
    mounted() {
        this.$watch('zoomFactor', this.formatZoomInput, { immediate: true });
    },
    methods: {
        formatZoomInput() {
            this.$refs.zoomInput.innerText = `${Math.round(this.zoomFactor * 100)}%`;
        },
        onZoomInputEnter(e) {
            // '100' or '100%' works
            let newZoomFactor = parseInt(e.target.innerText, 10) / 100;

            if (!isNaN(newZoomFactor)) {
                this.$store.commit('canvas/setFactor', newZoomFactor);
            }

            // de-focus input. Resets and formats zoom level
            e.target.blur();
        },
        onZoomInputClick(e) {
            e.target.focus();
            document.execCommand('selectAll', false, null);
        },
        onZoomInputFocusOut(e) {
            // Deselect text and reset to formatted value
            window.getSelection().removeAllRanges();
            this.formatZoomInput();
        },
        onZoomItemClick(e, item, id) {
            // TODO NXT-625: This is not how dispatch works. Only one parameter can be used as payload
            this.$store.dispatch(item.storeAction, ...item.storeActionParams);
            this.$refs.zoomInput.blur();
        }
    }
};
</script>

<template>
  <SubMenu
    class="zoom"
    :items="zoomActionItems"
    @item-click="onZoomItemClick"
  >
    <div
      ref="zoomInput"
      class="zoom-input"
      contenteditable
      @click.stop="onZoomInputClick"
      @keydown.enter.stop.prevent="onZoomInputEnter"
      @focusout.stop="onZoomInputFocusOut"
    />
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
      cursor: text;
      width: 54px;
      padding: 8px 4px 8px 16px;
      font-size: 14px;
      font-weight: 400;
      margin-right: 0;
    }
  }
}
</style>
