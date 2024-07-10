<script>
import { mapState } from "vuex";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";

/**
 * ZoomMenu offers predefined zoom levels and an input field to enter custom zoom levels
 */
export default {
  components: {
    DropdownIcon,
    SubMenu,
  },
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    ...mapState("canvas", ["zoomFactor"]),
    zoomInputValue() {
      return `${Math.round(this.zoomFactor * 100)}%`;
    },
    zoomMenuItems() {
      return [
        "fillScreen",
        "fitToScreen",
        "zoomIn",
        "zoomOut",
        "zoomTo75",
        "zoomTo100",
        "zoomTo125",
        "zoomTo150",
      ].map((action) => this.$shortcuts.get(action));
    },
  },
  methods: {
    onZoomInputEnter(e) {
      // '100' or '100%' works
      let newZoomFactor = parseInt(e.target.value, 10) / 100;

      if (!isNaN(newZoomFactor)) {
        this.$store.dispatch("canvas/zoomCentered", { factor: newZoomFactor });
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
    onZoomItemClick(e, item) {
      this.$shortcuts.dispatch(item.name);
      this.$refs.zoomInput.blur();
    },
    onWheel(e) {
      const delta = e.deltaY < 0 ? 1 : -1;
      this.$store.dispatch("canvas/zoomCentered", { delta });
    },
  },
};
</script>

<template>
  <SubMenu
    ref="subMenu"
    class="zoom"
    :teleport-to-body="false"
    :items="zoomMenuItems"
    :disabled="disabled"
    @item-click="onZoomItemClick"
  >
    <input
      ref="zoomInput"
      type="text"
      :value="zoomInputValue"
      class="zoom-input"
      @click.stop="onZoomInputClick"
      @keydown.enter.stop.prevent="onZoomInputEnter"
      @wheel.prevent="onWheel"
      @focusout.stop="onZoomInputFocusOut"
    />
    <DropdownIcon />
  </SubMenu>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.zoom {
  margin-left: auto;
  z-index: 5;

  & :deep(.submenu-toggle.expanded) {
    & .zoom-input {
      color: var(--theme-button-foreground-color-active, var(--knime-white));
    }

    & svg {
      transform: scaleY(-1);
    }
  }

  & :deep(.submenu-toggle) {
    padding: 0 13px 0 0;
    align-items: center;

    & svg {
      @mixin svg-icon-size 12;

      margin-bottom: 1px;
    }

    & .zoom-input {
      background: transparent;
      border: none;
      text-align: right;
      color: var(--theme-button-foreground-color, var(--knime-masala));
      width: 54px;
      padding: 8px 4px 8px 16px;
      font-size: 14px;
      margin-right: 0;

      &:focus {
        outline: none;
      }
    }
  }

  & :deep(.function-button:not(.active) svg) {
    stroke: var(--theme-button-foreground-color, var(--knime-masala));
  }
}
</style>
