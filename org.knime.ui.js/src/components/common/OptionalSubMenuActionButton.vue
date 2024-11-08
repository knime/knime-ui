<script setup lang="ts">
/*
 * Renders a button with MenuItems data, if it has children it will open a dropdown menu on click (SubMenu)
 */
import { Button, SubMenu } from "@knime/components";
import type { MenuItem } from "@knime/components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";

interface Props {
  item: MenuItem;
  hideDropdown?: boolean;
}

interface Emits {
  (e: "click", item: MenuItem): void;
}

defineEmits<Emits>();
withDefaults(defineProps<Props>(), {
  hideDropdown: false,
});
</script>

<template>
  <SubMenu
    v-if="item.children"
    v-bind="$attrs"
    :teleport-to-body="false"
    :title="item.title"
    orientation="left"
    class="submenu-button"
    :disabled="item.disabled"
    :items="item.children"
    @item-click="
      (_: MouseEvent, item: MenuItem) =>
        item.disabled ? null : $emit('click', item)
    "
  >
    <template #default="{ expanded }">
      <Component :is="item.icon" class="icon" />
      <span class="text">{{ item.text }}</span>
      <DropdownIcon
        v-if="!hideDropdown"
        class="dropdown-icon"
        :class="{ flip: expanded }"
      />
    </template>
  </SubMenu>
  <Button
    v-else
    v-bind="$attrs"
    :title="item.title ?? item.text"
    class="item-button"
    compact
    :aria-disabled="item.disabled || null"
    @click="item.disabled ? null : $emit('click', item)"
  >
    <Component :is="item.icon" class="icon" />
    <span class="text">{{ item.text }}</span>
  </Button>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.submenu-button {
  --z-index-common-menu-items-expanded: v-bind("$zIndices.layerExpandedMenus");

  & .dropdown-icon {
    margin-left: 5px;
    margin-top: 3px;

    @mixin svg-icon-size 12;

    stroke: var(--knime-masala);

    &.flip {
      transform: scaleY(-1);
    }
  }
}

.button.item-button,
.submenu-button :deep(.submenu-toggle) {
  margin-left: 5px;
  border: 1px solid var(--knime-silver-sand);
  padding: 5px 14px;
  color: var(--knime-masala);

  & svg:not(.dropdown-icon) {
    @mixin svg-icon-size 18;

    stroke: var(--knime-masala);
    margin-right: 4px;
  }

  &:hover,
  &:active,
  &:focus,
  &.expanded {
    cursor: pointer;
    border-color: var(--theme-button-function-background-color-hover);
    color: var(--theme-button-function-foreground-color-hover);
    background-color: var(--theme-button-function-background-color-hover);

    & svg {
      stroke: var(--knime-white);
    }
  }

  &[aria-disabled] {
    cursor: default;
    opacity: 0.6;

    &:hover,
    &:active,
    &:focus {
      border-color: var(--knime-silver-sand-semi);
      color: var(--knime-masala);
      background-color: transparent;
      cursor: default;
    }

    & svg.icon {
      stroke: var(--knime-masala);
    }
  }
}
</style>
