<script setup lang="ts">
import { ref } from "vue";
import { useElementHover } from "@vueuse/core";

import type { NavMenuItemProps } from "./types";

const props = withDefaults(defineProps<NavMenuItemProps>(), {
  active: false,
  href: null,
  withIndicator: false,
  highlighted: false,
});

const emit = defineEmits<{
  click: [event: KeyboardEvent | MouseEvent];
}>();

const itemOnClickHandler = (event: KeyboardEvent | MouseEvent) => {
  if (!props.href) {
    event.preventDefault();
  }

  emit("click", event);
};

const itemRef = ref<HTMLElement>();
const isHovered = useElementHover(itemRef);
</script>

<template>
  <li
    :class="[
      'menu-item',
      { active, highlighted, 'with-indicator': withIndicator },
    ]"
  >
    <a
      ref="itemRef"
      :href="href ?? '#'"
      class="menu-item-main"
      @click="itemOnClickHandler"
    >
      <div v-if="$slots.prepend" class="prepend">
        <slot name="prepend" :is-item-hovered="isHovered" />
      </div>

      <div class="text" :title="text">
        {{ text }}
      </div>

      <div v-if="$slots.append" class="append">
        <slot name="append" :is-item-hovered="isHovered" />
      </div>
    </a>

    <div v-if="$slots.children" class="menu-item-children">
      <slot name="children" :is-item-hovered="isHovered" />
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
  --text-active-color: var(--knime-cornflower-dark);
  --text-hover-color: var(--knime-masala);
  --bg-active: var(--knime-cornflower-semi);

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
    color: var(--text-active-color);

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

  &.highlighted > .menu-item-main {
    background: var(--bg-active);
  }

  &.with-indicator::after {
    content: "";
    display: block;
    position: absolute;
    left: 0;
    top: var(--inline-padding);
    background: var(--knime-cornflower);
    width: 4px;
    height: 16px;
    border-radius: 0 4px 4px 0;
  }
}
</style>
