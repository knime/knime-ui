<script setup lang="ts" generic="T">
import type { NavMenuItem } from "./types";

type Props = {
  item: NavMenuItem<T>;
};

defineProps<Props>();

const itemOnClickHandler = (
  item: NavMenuItem,
  event: KeyboardEvent | MouseEvent,
) => {
  if (!item.href) {
    event.preventDefault();
  }

  item.onClick?.(event, item);
};
</script>

<template>
  <li :class="['menu-item', { active: item.active }]">
    <a
      :href="item.href ?? '#'"
      class="menu-item-main"
      @click="itemOnClickHandler(item, $event)"
    >
      <div v-if="$slots.prepend" class="prepend">
        <slot name="prepend" />
      </div>

      <div class="text" :title="item.text">
        {{ item.text }}
      </div>

      <div v-if="$slots.append" class="append">
        <slot name="append" />
      </div>
    </a>

    <div v-if="$slots.children" class="menu-item-children">
      <slot name="children" />
    </div>
  </li>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.menu-item {
  --typography-font-family: "Roboto", sans-serif;

  /* weight, size/line-height, family  */
  --typography-button-medium-prominent: 600 15px/16px
    var(--typography-font-family);

  --inline-padding: 8px;
  --text-default-color: var(--knime-dove-gray);
  --text-active-color: v-bind("$colors.selection.activeBorder");
  --text-hover-color: var(--knime-masala);
  --bg-active: v-bind("$colors.selection.activeBackground");
  --bg-hover: v-bind("$colors.selection.hoverBackground");

  @define-mixin active-indicator {
    content: "";
    display: block;
    position: absolute;
    left: 0;
    top: var(--inline-padding);
    background: v-bind("$colors.selection.activeBorder");
    width: 4px;
    height: 16px;
    border-radius: 0 4px 4px 0;

    @mixin-content;
  }

  color: var(--text-default-color);
  font: var(--typography-button-medium-prominent);
  position: relative;

  & .menu-item-main {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    padding: 0 8px;
    text-decoration: none;
    margin-bottom: 8px;

    & .prepend :slotted(svg),
    & .append :slotted(svg) {
      --size: 16;

      display: flex;
      stroke: var(--text-default-color);
      min-width: calc(var(--size) * 1px);

      @mixin svg-icon-size var(--size);
    }

    & .text {
      padding: var(--inline-padding) 0;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      max-width: 225px;
    }

    & .append {
      /* flush to the right */
      margin-left: auto;
    }
  }

  & .menu-item-children {
    & .menu-item-main {
      padding-left: 28px;
    }
  }

  &.active {
    & > .menu-item-main .prepend :slotted(svg),
    & > .menu-item-main .append :slotted(svg) {
      stroke: var(--text-active-color);
    }
  }

  & > .menu-item-main:hover {
    color: var(--text-hover-color);
    background: var(--bg-active);

    & .prepend :slotted(svg),
    & .append :slotted(svg) {
      stroke: var(--text-hover-color);
    }
  }

  /* For: items **without** children */
  &.active:not(:has(.menu-item-children)) {
    color: var(--text-active-color);
    background: var(--bg-active);

    &::after {
      @mixin active-indicator;
    }
  }

  /* For: items **with** children */
  &.active:has(.menu-item-children) {
    /* if it does NOT have a child that's active -> ONLY parent is active */
    &:not(:has(.menu-item-children .active)) {
      /* apply color & bg on parent */
      & > .menu-item-main {
        color: var(--text-active-color);
        background: var(--bg-active);
      }

      /* add indicator on parent */
      &::after {
        @mixin active-indicator;
      }
    }

    /* if it has a child that's active -> BOTH parent & child are active */
    &:has(.menu-item-children .active) {
      /* apply color on parent */
      color: var(--text-active-color);

      /* and bg on child only */
      & .menu-item-children .active {
        background: var(--bg-active);
      }

      /* add indicator on parent */
      &::after {
        @mixin active-indicator;
      }

      /* remove indicator from child */
      & .menu-item-children .active::after {
        display: none;
      }
    }
  }
}
</style>
