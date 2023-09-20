<script setup lang="ts">
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import DropdownIcon from "webapps-common/ui/assets/img/icons/arrow-dropdown.svg";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";

interface Props {
  title?: string;
  items: MenuItem;
  noDropdownIcon?: boolean;
}

interface Emits {
  (e: "item-click", item: MenuItem): void;
}

defineEmits<Emits>();
withDefaults(defineProps<Props>(), { noDropdownIcon: false, title: null });
</script>

<template>
  <SubMenu
    v-bind="$attrs"
    :button-title="title"
    :teleport-to-body="false"
    orientation="left"
    class="submenu-button"
    :items="items"
    @item-click="(_, item) => $emit('item-click', item)"
  >
    <template #default="{ expanded }">
      <slot />
      <DropdownIcon
        v-if="!noDropdownIcon"
        class="dropdown-icon"
        :class="{ flip: expanded }"
      />
    </template>
  </SubMenu>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.submenu-button {
  & svg.dropdown-icon {
    margin-left: 5px;
    margin-top: 3px;

    @mixin svg-icon-size 12;

    &.flip {
      transform: scaleY(-1);
    }
  }
}

.submenu-button :deep(.submenu-toggle) {
  border: 1px solid var(--knime-silver-sand);
  padding: 5px 14px;
  color: var(--knime-masala);

  & :slotted(svg) {
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
