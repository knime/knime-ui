<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    isSelected: {
      type: Boolean,
      required: true,
    },

    isDragging: {
      type: Boolean,
      required: true,
    },
  },
});
</script>

<template>
  <tr
    class="file-explorer-item-base"
    :class="{
      selected: !isDragging && isSelected,
      dragging: isDragging && isSelected,
    }"
    data-test-id="file-explorer-item"
  >
    <td class="item-icon">
      <slot name="icon" />
    </td>
    <slot />
  </tr>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.file-explorer-item-base {
  --icon-size: 20;
  --item-padding: 8px;
  --selection-color: hsl(206deg 74% 90%/100%);

  user-select: none;
  background: var(--knime-gray-ultra-light);
  transition: box-shadow 0.15s;
  display: flex;
  flex-flow: row nowrap;
  width: 100%;
  margin-bottom: 2px;
  align-items: center;

  /* add transparent border to prevent jumping when the dragging-over styles add a border */
  border: 1px solid transparent;

  &:hover {
    box-shadow: var(--shadow-elevation-1);
  }

  &.selected {
    background: var(--selection-color);
  }

  &.dragging {
    background: var(--selection-color);
    color: var(--knime-masala);
  }

  &.dragging-over {
    background: var(--knime-porcelain);
    border: 1px solid var(--knime-dove-gray);
  }

  & td,
  & :slotted(td) {
    /* Prevent children from interfering with drag events */
    pointer-events: none;
  }

  & .item-icon {
    padding: var(--item-padding);
    position: relative;

    & :slotted(svg) {
      display: flex;

      @mixin svg-icon-size var(--icon-size);

      stroke: var(--knime-masala);
    }
  }
}
</style>
