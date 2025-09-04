<script setup lang="ts">
/*
 * Renders a button with MenuItems data, if it has children it will open a dropdown menu on click (SubMenu)
 */
import { Button, SubMenu } from "@knime/components";
import type { MenuItem } from "@knime/components";

type Props = {
  item: MenuItem;
};

type Emits = {
  click: [item: MenuItem];
};

defineProps<Props>();
defineEmits<Emits>();
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
    :aria-label="item.title ?? item.text"
    :items="item.children"
    @item-click="
      (_: MouseEvent, item: MenuItem) =>
        item.disabled ? null : $emit('click', item)
    "
  >
    <template #default>
      <Component :is="item.icon" class="icon" />
      <span class="text">{{ item.text }}</span>
    </template>
  </SubMenu>
  <Button
    v-else
    v-bind="$attrs"
    :title="item.title ?? item.text"
    :aria-label="item.title ?? item.text"
    class="item-button"
    compact
    :aria-disabled="item.disabled || null"
    @click="item.disabled ? null : $emit('click', item)"
  >
    <Component
      :is="item.icon"
      class="icon"
      aria-hidden="true"
      focusable="false"
    />
    <span class="text">{{ item.text }}</span>
  </Button>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.button.item-button {
  --theme-button-small-foreground-color-hover: var(--knime-white);
  --theme-button-small-background-color-hover: var(--knime-dove-gray);
  --theme-button-small-foreground-color-focus: var(--knime-white);
  --theme-button-small-background-color-focus: var(--knime-dove-gray);
}

.button.item-button,
.submenu-button :deep(.submenu-toggle) {
  border: 1px solid var(--knime-dove-gray);
  display: flex;
  margin-left: 0;
  align-items: center;
  justify-content: center;
  color: var(--knime-white);
  height: var(--header-button-height);
  padding: 10px;

  & svg {
    @mixin svg-icon-size 16;

    margin-right: var(--space-4);
    stroke: var(--knime-white);
  }
}
</style>
