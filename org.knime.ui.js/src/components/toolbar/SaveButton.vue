<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { SubMenu } from "@knime/components";
import type { MenuItem } from "@knime/components";
import { Button } from "@knime/kds-components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";

import { useShortcuts } from "@/plugins/shortcuts";
import { useApplicationStore } from "@/store/application/application";

const $shortcuts = useShortcuts();

const { activeProjectId, isUnknownProject } = storeToRefs(
  useApplicationStore(),
);

const hasSubmenu = computed(() => {
  if (isUnknownProject.value(activeProjectId.value)) {
    return false;
  }

  return true;
});

const subMenuItems = computed((): MenuItem[] => {
  if (!hasSubmenu.value) {
    return [];
  }

  const saveAs = $shortcuts.get("saveAs");

  return [
    {
      text: $shortcuts.getText("saveAs"),
      icon: saveAs.icon,
      hotkeyText: saveAs.hotkeyText,
      disabled: !$shortcuts.isEnabled("saveAs"),
    },
  ];
});

const save = computed(() => $shortcuts.get("save"));

const title = computed(() => {
  const { title, hotkeyText } = save.value;
  return [title, hotkeyText].filter(Boolean).join(" – ");
});
</script>

<template>
  <div :class="{ 'split-button': hasSubmenu }" data-test-id="save">
    <Button
      :class="['toolbar-button']"
      :disabled="!$shortcuts.isEnabled('save')"
      :title="title"
      :aria-label="save.text"
      :label="$shortcuts.getText('save')"
      leading-icon="save"
      variant="transparent"
      @click="$shortcuts.dispatch('save')"
    />

    <SubMenu
      v-if="hasSubmenu"
      ref="submenu"
      :teleport-to-body="false"
      :items="subMenuItems"
      tabindex="-1"
      orientation="left"
      button-title="Open save options"
      aria-label="Save menu"
      @item-click="(_: MouseEvent) => $shortcuts.dispatch('saveAs')"
      @keydown.enter.stop.prevent="
        (e: KeyboardEvent) => ($refs.submenu as any).toggleMenu(e)
      "
    >
      <DropdownIcon aria-hidden="true" focusable="false" />
    </SubMenu>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.toolbar-button.responsive {
  @media (max-width: 1200px) {
    padding-right: unset;

    & .text {
      display: none;
    }
  }
}

.split-button {
  --z-index-common-menu-items-expanded: v-bind("$zIndices.layerExpandedMenus");

  display: inline-flex;
  margin-right: var(--kds-spacing-container-0-5x);

  & .button {
    position: relative;
    margin-bottom: 0;
    margin-right: 0;
    border-right: none;

    /* fix disabled states for split buttons */
    &:disabled {
      opacity: 1;

      & svg {
        color: var(--kds-color-text-and-icon-disabled);
      }
    }

    /* best way to ensure flexible 1/4 corners */
    border-radius: var(
        --kds-legacy-button-border-radius,
        var(--kds-border-radius-container-0-37x)
      )
      0 0
      var(
        --kds-legacy-button-border-radius,
        var(--kds-border-radius-container-0-37x)
      );
  }

  &:hover,
  &:focus-within {
    & .button {
      &::after {
        display: none;
      }
    }
  }

  & .submenu {
    display: inline-flex;
    border: var(--kds-color-border-transparent);
    border-left: none;

    &:hover {
      background: transparent;
    }

    /* best way to ensure flexible 1/4 corners */
    border-radius: 0 var(--kds-border-radius-container-0-37x)
      var(--kds-border-radius-container-0-37x) 0;
    border-radius: 0
      var(
        --kds-legacy-button-border-radius,
        var(--kds-border-radius-container-0-37x)
      )
      var(
        --kds-legacy-button-border-radius,
        var(--kds-border-radius-container-0-37x)
      )
      0;

    &:focus-visible {
      outline: var(--kds-border-action-focused);
      outline-offset: 1px;
    }

    &:deep(.function-button.active) {
      background-color: transparent;
    }

    /* style toggle button (the dropdown icon) */
    & :deep(.submenu-toggle) {
      width: calc(var(--kds-dimension-component-width-1-75x) - 1px);
      height: calc(var(--kds-dimension-component-height-1-75x) - 2px);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0
        var(
          --kds-legacy-button-border-radius,
          var(--kds-border-radius-container-0-37x)
        )
        var(
          --kds-legacy-button-border-radius,
          var(--kds-border-radius-container-0-37x)
        )
        0;

      &:focus-visible {
        outline: var(--kds-border-action-focused);
        outline-offset: 1px;
        background-color: var(--kds-color-background-neutral);
      }

      &:hover {
        color: var(--kds-color-text-and-icon-neutral);
        background-color: var(--kds-color-background-neutral-hover);
        border-color: var(--kds-color-background-neutral-hover);
      }

      & svg {
        @mixin svg-icon-size 14;

        stroke: var(--kds-color-text-and-icon-neutral);
        padding: 0;
      }
    }

    /* open/close submenu dropdown icon */
    & :deep(.submenu-toggle.expanded) svg {
      transform: scaleY(-1);
    }

    /* emulate button hover state */
    &.expanded {
      background: var(--kds-color-background-neutral-hover);
    }
  }
}
</style>
