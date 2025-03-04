<script>
import NestedSvg from "../../../common/NestedSVG";

/** SVG Button that is displayed above a hovered or selected node */
export default {
  components: {
    NestedSvg,
  },
  props: {
    /** x-position of the button */
    x: {
      type: [Number, String],
      default: 0,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    /** title of the button; displays on hover */
    title: {
      type: [String, null],
      default: null,
    },
    primary: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["click"],
  methods: {
    onClick(e) {
      if (!this.disabled) {
        this.$emit("click", e);
      }
    },
  },
};
</script>

<template>
  <g
    :class="['action-button', { disabled }]"
    @click.left.stop="onClick"
    @pointerdown.stop
  >
    <circle
      r="9.5"
      :cx="x"
      filter="url(#node-action-button-shadow)"
      :class="{ primary }"
    />
    <rect width="24" height="24" :x="x - 12" y="-12" opacity="0" />
    <title v-if="title">{{ title }}</title>
    <NestedSvg width="20" height="20" :x="x - 10" y="-10">
      <slot />
    </NestedSvg>
  </g>
</template>

<style lang="postcss" scoped>
.action-button {
  & circle {
    fill: white;
    stroke: var(--knime-silver-sand);

    &.primary {
      fill: var(--knime-yellow);
      stroke: var(--knime-yellow);
    }
  }

  & :deep(svg) {
    /* divide by 20 to match the width & height of the NestedSvg component,
      and get a stroke width of 1px
    */
    stroke-width: calc(32px / 20);
    stroke: var(--knime-masala);
    pointer-events: none;
  }

  &.disabled {
    & circle {
      filter: none;
      stroke: var(--knime-silver-sand);
    }

    & :deep(svg) {
      stroke: var(--knime-silver-sand);
    }
  }

  &:not(.disabled) {
    cursor: pointer;

    &:hover circle {
      fill: var(--knime-masala);
      stroke: var(--knime-masala);
    }

    &:hover :deep(svg) {
      stroke: var(--knime-white);
    }

    &:active circle {
      fill: var(--knime-black);
      filter: none;
      stroke: var(--knime-black);
    }

    &:active :deep(svg) {
      stroke: var(--knime-white);
    }

    &:active {
      transform: scale(0.98) translateY(0.5px);
      transition-duration: 80ms;
    }
  }
}
</style>
