<script setup lang="ts">
/*
 * Renders a button with MenuItems data, if it has children it will open a dropdown menu on click (SubMenu)
 */
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";
import Button from "webapps-common/ui/components/Button.vue";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import DropdownIcon from "webapps-common/ui/assets/img/icons/arrow-dropdown.svg";

interface Props {
  item: MenuItem;
}

interface Emits {
  (e: "click", item: MenuItem): void;
}

defineEmits<Emits>();
defineProps<Props>();
</script>

<template>
  <SubMenu
    v-if="item.children"
    v-bind="$attrs"
    :teleport-to-body="false"
    :title="item.title"
    orientation="left"
    class="submenu-button"
    :disabled="item.disabled || null"
    :items="item.children"
    @item-click="(_, item) => (item.disabled ? null : $emit('click', item))"
  >
    <template #default="{ expanded }">
      <Component :is="item.icon" class="icon" />
      {{ item.text }}
      <DropdownIcon class="dropdown-icon" :class="{ flip: expanded }" />
    </template>
  </SubMenu>
  <Button
    v-else
    v-bind="$attrs"
    :title="item.title"
    class="item-button"
    compact
    :aria-disabled="item.disabled || null"
    @click="item.disabled ? null : $emit('click', item)"
  >
    <Component :is="item.icon" class="icon" />
    {{ item.text }}
  </Button>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.submenu-button {
  & .dropdown-icon {
    margin-left: 5px;

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

  & svg {
    @mixin svg-icon-size 18;

    stroke: var(--knime-masala);
    margin-right: 4px;
  }

  &:hover,
  &:active,
  &:focus,
  &.expanded {
    cursor: pointer;
    color: var(--knime-white);
    background-color: var(--knime-masala);
    border-color: var(--knime-masala);

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
