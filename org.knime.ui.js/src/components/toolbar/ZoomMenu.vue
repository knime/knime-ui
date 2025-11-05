<script setup lang="ts">
import { computed, useTemplateRef } from "vue";

import { type MenuItem, SubMenu } from "@knime/components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";

import { useShortcuts } from "@/plugins/shortcuts";
import type { FormattedShortcut } from "@/shortcuts";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";

/**
 * ZoomMenu offers predefined zoom levels and an input field to enter custom zoom levels
 */

type Props = {
  disabled?: boolean;
};

const $shortcuts = useShortcuts();
withDefaults(defineProps<Props>(), { disabled: false });
const canvasStore = useCurrentCanvasStore();

const zoomInputValue = computed(
  () => `${Math.round(canvasStore.value.zoomFactor * 100)}%`,
);

const zoomActions = [
  "fillScreen",
  "fitToScreen",
  "zoomIn",
  "zoomOut",
  "zoomTo75",
  "zoomTo100",
  "zoomTo125",
  "zoomTo150",
] as const;

const zoomMenuItems = computed<MenuItem[]>(() => {
  return zoomActions.map((action) => $shortcuts.get(action)) as MenuItem[];
});

const onZoomInputEnter = (event: KeyboardEvent) => {
  if (!event.target) {
    return;
  }

  const target = event.target as HTMLInputElement;

  // '100' or '100%' works
  let newZoomFactor = parseInt(target.value, 10) / 100;

  if (!isNaN(newZoomFactor)) {
    canvasStore.value.zoomCentered({ factor: newZoomFactor });
  }

  // de-focus input. Resets and formats zoom level
  target.blur();
  target.value = zoomInputValue.value;
};

const onZoomInputClick = (event: MouseEvent) => {
  (event.target! as HTMLInputElement).focus();
  (event.target! as HTMLInputElement).select();
};

const onZoomInputFocusOut = (event: FocusEvent) => {
  // Deselect text and reset to formatted value
  (event.target! as HTMLInputElement).blur();
  (event.target! as HTMLInputElement).value = zoomInputValue.value;
};

const zoomInput = useTemplateRef("zoomInput");

const onZoomItemClick = (_event: KeyboardEvent, item: FormattedShortcut) => {
  $shortcuts.dispatch(item.name);
  zoomInput.value?.blur();
};

const onWheel = (e: WheelEvent) => {
  const delta = e.deltaY < 0 ? 1 : -1;
  canvasStore.value.zoomCentered({ delta });
};
</script>

<template>
  <SubMenu
    ref="subMenu"
    class="zoom"
    :teleport-to-body="false"
    :items="zoomMenuItems"
    :disabled="disabled"
    button-title="Zoom Menu"
    @item-click="onZoomItemClick"
  >
    <input
      ref="zoomInput"
      type="text"
      aria-label="Zoom level"
      :value="zoomInputValue"
      class="zoom-input"
      @click.stop="onZoomInputClick"
      @keydown.enter.stop.prevent="onZoomInputEnter"
      @wheel.prevent="onWheel"
      @focusout.stop="onZoomInputFocusOut"
    />
    <DropdownIcon aria-hidden="true" focusable="false" />
  </SubMenu>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.zoom {
  --z-index-common-menu-items-expanded: v-bind("$zIndices.layerExpandedMenus");

  & :deep(.submenu-toggle.expanded) {
    & .zoom-input {
      color: var(--kds-color-text-and-icon-neutral);
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

     &:focus-visible, &:focus-within {
        outline: var(--kds-border-action-focused);
        outline-offset: 1px;
        border-radius: var(
          --kds-legacy-button-border-radius,
          var(--kds-border-radius-container-0-37x)
        )
        0
        0
        var(
          --kds-legacy-button-border-radius,
          var(--kds-border-radius-container-0-37x)
        );
      }

    & .zoom-input {
      background: transparent;
      border: none;
      text-align: right;
      color: var(--kds-color-text-and-icon-neutral);
      width: var(--kds-dimension-component-width-4x);
      padding: var(--kds-spacing-container-0-5x) var(--kds-spacing-container-0-25x) var(--kds-spacing-container-0-5x) var(--kds-spacing-container-1x);
      font-size: var(--kds-font-base-interactive-medium-strong);
      margin-right: 0;

      &:focus-visible {
        outline: none;
      }
    }
  }

  & :deep(.function-button:not(.active) svg) {
    stroke: var(--theme-button-foreground-color, var(--knime-masala));
  }
}
</style>
