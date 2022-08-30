<script>
/**
 * A tooltip displaying text and an optional headline
 */
export default {
    props: {
        /**
         * The text to display
         */
        text: {
            type: [String, Number],
            default: null
        },
        /**
         * An optional headline
         */
        title: {
            type: String,
            default: null
        },
        /**
         * horizontal position of the arrow tip
         */
        x: {
            type: Number,
            default: 0
        },
        /**
         * vertical position of the arrow tip
         */
        y: {
            type: Number,
            default: 0
        },
        /**
         * Type of tooltip. Affects styling
         */
        type: {
            type: String,
            default: 'default',
            validator: type => ['error', 'warning', 'default'].includes(type)
        },
        /**
         * `top` to render the tooltip above the target, `bottom` to render below.
         */
        orientation: {
            type: String,
            default: 'bottom',
            validator: orientation => ['bottom', 'top'].includes(orientation)
        },
        /**
         * spacing between the invisible hoverable boundaries of the tooltip and the visible part
         */
        gap: {
            type: Number,
            default: 0
        },
        /** if tooltip is hoverable, it will stay open when the mouse moves onto it */
        hoverable: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        expandedGap() {
            // The arrow tip is outside of the bounding box and rotated by 45°.
            return this.gap + this.$shapes.tooltipArrowSize * Math.SQRT1_2;
        }
    }
};
</script>

<template>
  <div
    :class="['tooltip', orientation, type, { hoverable }]"
    :style="{
      '--arrowSize': `${$shapes.tooltipArrowSize}px`,
      '--gapSize': `${expandedGap}px`,
      top: `${y}px`,
      left: `${x}px`,
      maxWidth: `${$shapes.tooltipMaxWidth}px`,
    }"
  >
    <div class="wrap-arrow">
      <div
        class="scroller"
        :style="{maxHeight: `${$shapes.tooltipMaxHeight}px`}"
      >
        <div
          v-if="title"
          class="title"
        >
          {{ title }}
        </div>
        <p v-if="text">
          {{ text }}
        </p>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.tooltip {
  --border-width: 1px;

  position: relative;
  display: inline-block;
  transform: translate(-50%, calc(-1 * var(--border-width)));

  &:not(.hoverable) {
    pointer-events: none;
  }

  &.top {
    transform: translate(-50%, calc(-100% + var(--border-width)));
    padding-bottom: var(--gapSize);
  }

  &.bottom {
    padding-top: var(--gapSize);
  }

  & .scroller {
    position: relative;
    z-index: 1;
    padding: 8px 10px 10px 10px;
    overflow-y: auto;
    font-family: "Roboto Condensed", sans-serif;
    font-size: 13px;
    line-height: 19px;

    & .title {
      font-weight: 700;
      line-height: 19px;
    }

    & p {
      margin: 0;
    }
  }

  & .wrap-arrow {
    box-shadow: 0 0 10px rgba(62, 58, 57, 0.3);
    border: var(--border-width) solid;
    position: relative;
  }

  &.top .wrap-arrow::after,
  &.bottom .wrap-arrow::before {
    width: var(--arrowSize);
    height: var(--arrowSize);
    content: '';
    position: absolute;
    left: 50%;
    border: var(--border-width) solid;
    border-left-color: transparent;
    border-bottom-color: transparent;
  }

  &.top .wrap-arrow::after {
    bottom: 0;
    transform: translate(-50%, 50%) rotate(135deg);
  }

  &.bottom .wrap-arrow::before {
    top: 0;
    transform: translate(-50%, -50%) rotate(-45deg);
  }

  &.warning {
    color: var(--knime-masala);

    & .wrap-arrow {
      border-radius: 1px;
      border-color: var(--warning-color);

      &::after,
      &::before {
        border-color: var(--warning-color);
        background-color: white;
      }
    }

    & .scroller {
      background-color: white;
    }
  }

  &.error {
    color: var(--knime-masala);

    & .wrap-arrow {
      border-radius: 1px;
      border-color: var(--error-color);

      &::after,
      &::before {
        border-color: var(--error-color);
        background-color: white;
      }
    }

    & .scroller {
      background-color: white;
    }
  }

  &.default {
    color: white;

    & .wrap-arrow {
      border-color: var(--knime-masala);

      &::before,
      &::after {
        border-color: var(--knime-masala);
        background-color: var(--knime-masala);
      }
    }

    & .scroller {
      background-color: var(--knime-masala);
      padding: 2px 6px 4px 6px;
    }
  }
}
</style>
