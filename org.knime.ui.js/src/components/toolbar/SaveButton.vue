<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { type MenuItem, SubMenu } from "@knime/components";
import { KdsButton } from "@knime/kds-components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";

import { useShortcuts } from "@/services/shortcuts";
import { useApplicationStore } from "@/store/application/application";

import { toolbarButtonTitle } from "./toolbarButtonTitle";

const $shortcuts = useShortcuts();

const { activeProjectId, isUnknownProject } = storeToRefs(
  useApplicationStore(),
);

type MetadataWithHandler = {
  handler: () => void;
};

const canSave = computed(() => !isUnknownProject.value(activeProjectId.value));

const mainAction = computed(() => {
  if (canSave.value) {
    return {
      title: toolbarButtonTitle($shortcuts.get("save")),
      label: $shortcuts.getText("save"),
      icon: "save",
      disabled: !$shortcuts.isEnabled("save"),
      onClick: () => $shortcuts.dispatch("save"),
    };
  } else {
    return {
      title: toolbarButtonTitle($shortcuts.get("saveAs")),
      label: $shortcuts.getText("saveAs"),
      icon: "save-as",
      disabled: !$shortcuts.isEnabled("saveAs"),
      onClick: () => $shortcuts.dispatch("saveAs"),
    };
  }
});

const subMenuItems = computed((): MenuItem[] => {
  const saveAs = $shortcuts.get("saveAs");
  const exportShortcut = $shortcuts.get("export");

  return [
    {
      text: $shortcuts.getText("saveAs"),
      icon: saveAs.icon,
      hotkeyText: saveAs.hotkeyText,
      disabled: !$shortcuts.isEnabled("saveAs"),
      title: toolbarButtonTitle(saveAs),
      metadata: {
        handler: () => $shortcuts.dispatch("saveAs"),
      } as MetadataWithHandler,
    },
    {
      text: $shortcuts.getText("export"),
      icon: exportShortcut.icon,
      hotkeyText: exportShortcut.hotkeyText,
      disabled: !$shortcuts.isEnabled("export"),
      title: toolbarButtonTitle(exportShortcut),
      metadata: {
        handler: () => $shortcuts.dispatch("export"),
      } as MetadataWithHandler,
    },
  ];
});
</script>

<template>
  <div :class="{ 'split-button': canSave }" data-test-id="save">
    <KdsButton
      v-if="mainAction"
      class="toolbar-button"
      data-test-id="main-action"
      :disabled="mainAction.disabled"
      :title="mainAction.title"
      :aria-label="mainAction.label"
      :label="mainAction.label"
      :leading-icon="mainAction.icon"
      variant="transparent"
      @click="mainAction.onClick"
    />

    <SubMenu
      v-if="canSave"
      ref="submenu"
      :teleport-to-body="false"
      :items="subMenuItems"
      tabindex="-1"
      orientation="left"
      button-title="Open save options"
      aria-label="Save menu"
      @item-click="
        (_: MouseEvent, item: MenuItem) =>
          (item.metadata as MetadataWithHandler).handler()
      "
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
      width: var(--kds-dimension-component-width-1-75x);
      height: var(--kds-dimension-component-height-1-75x);
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
        @mixin svg-icon-size 12;

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
