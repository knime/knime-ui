<script setup lang="ts" generic="T">
import type { SidebarNavItem } from "./types";

type Props = {
  item: SidebarNavItem<T>;
};

defineProps<Props>();
</script>

<template>
  <li
    :class="[
      'menu-item',
      {
        active: item.active,
        clickable: item.clickable,
      },
    ]"
    @click="item.clickable && item.onClick?.($event)"
  >
    <div :class="['menu-item-main']">
      <div :class="['name', { hoverable: item.hoverable }]" :title="item.text">
        <Component :is="item.icon" />
        <span>{{ item.text }}</span>
      </div>

      <div class="append">
        <slot name="append" :item="item" />
      </div>
    </div>

    <ul
      v-if="item.children && item.children.length > 0"
      class="menu-item-children-list"
    >
      <li
        v-for="child of item.children"
        :key="child.id"
        :class="['menu-item-children', { active: child.active }]"
        @click="child.clickable && child.onClick?.($event)"
      >
        <div class="name hoverable" :title="child.text">
          <Component :is="child.icon" />
          <span>{{ child.text }}</span>
        </div>
        <slot name="child-append" :item="item" :child="child" />
      </li>
    </ul>
  </li>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.menu-item {
  color: var(--knime-dove-gray);
  font-weight: 500;
  padding-bottom: 20px;

  /* 6px of top space - avoids jumping when border changes */
  border-top: 1px solid var(--knime-silver-sand);
  padding-top: 5px;

  & .name {
    display: flex;
    align-items: center;
    gap: 8px;

    & span {
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      max-width: 225px;
    }

    & svg {
      --size: 18;

      min-width: calc(var(--size) * 1px);

      @mixin svg-icon-size var(--size);
    }
  }

  &.active {
    /* 6px of top space - avoids jumping when border changes */
    border-top: 3px solid var(--knime-masala);
    padding-top: 3px;

    & .menu-item-main > .name {
      color: var(--knime-masala);
      font-weight: 700;
    }
  }

  & .menu-item-main {
    display: flex;
    justify-content: space-between;
    align-items: center;

    & .append {
      padding: 1px 0 0 12px;
    }
  }

  & .menu-item-children-list {
    padding-top: 10px;
  }

  & .menu-item-children {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0 4px 24px;

    &.active {
      font-weight: 700;
      background: v-bind("$colors.selection.activeBackground");
      color: var(--knime-masala);
    }
  }
}

.hoverable:hover {
  cursor: pointer;
  font-weight: 700;
  color: var(--knime-masala);
}
</style>
