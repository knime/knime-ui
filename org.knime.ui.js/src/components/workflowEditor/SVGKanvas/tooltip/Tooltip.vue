<script lang="ts">
import { type PropType, defineComponent } from "vue";

const TOOLTIP_TYPES = ["error", "warning", "default"] as const;
const TOOLTIP_ORIENTATIONS = ["bottom", "top"] as const;

type TooltipType = (typeof TOOLTIP_TYPES)[number];
type TooltipOrientation = (typeof TOOLTIP_ORIENTATIONS)[number];
/**
 * A tooltip displaying text and an optional headline
 */
export default defineComponent({
  props: {
    /**
     * The text to display
     */
    text: {
      type: [String, Number],
      default: null,
    },
    /**
     * An optional headline
     */
    title: {
      type: String,
      default: null,
    },
    issue: {
      type: String,
      default: null,
    },
    resolutions: {
      type: Array as PropType<Array<string>>,
      default: () => [],
    },
    /**
     * horizontal position of the arrow tip
     */
    x: {
      type: Number,
      default: 0,
    },
    /**
     * vertical position of the arrow tip
     */
    y: {
      type: Number,
      default: 0,
    },
    /**
     * Type of tooltip. Affects styling
     */
    type: {
      type: String as PropType<TooltipType>,
      default: "default",
      validator: (type: TooltipType) => TOOLTIP_TYPES.includes(type),
    },
    /**
     * `top` to render the tooltip above the target, `bottom` to render below.
     */
    orientation: {
      type: String as PropType<TooltipOrientation>,
      default: "bottom",
      validator: (orientation: TooltipOrientation) =>
        TOOLTIP_ORIENTATIONS.includes(orientation),
    },
    /**
     * spacing between the invisible hoverable boundaries of the tooltip and the visible part
     */
    gap: {
      type: Number,
      default: 0,
    },
    /** if tooltip is hoverable, it will stay open when the mouse moves onto it */
    hoverable: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    expandedGap() {
      // The arrow tip is outside of the bounding box and rotated by 45°.
      return this.gap + this.$shapes.tooltipArrowSize * Math.SQRT1_2;
    },
  },
});
</script>

<template>
  <div
    :class="['tooltip', orientation, type, { hoverable }]"
    data-test-id="tooltip"
    data-is-tooltip="true"
    :style="{
      top: `${y}px`,
      left: `${x}px`,
      maxWidth: `${$shapes.tooltipMaxWidth}px`,
    }"
  >
    <div class="wrap-arrow">
      <div
        class="scroller"
        :style="{ maxHeight: `${$shapes.tooltipMaxHeight}px` }"
      >
        <div v-if="title" class="title">
          {{ title }}
        </div>
        <p v-if="text" class="text">
          {{ text }}
        </p>
        <div v-if="issue" class="issue" v-text="issue" />
        <div v-if="resolutions.length" class="resolutions">
          Potential resolutions:
          <ul>
            <li v-for="res in resolutions" :key="res">
              {{ res }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.tooltip {
  --border-width: 1px;
  --arrow-size: v-bind(`${$shapes.tooltipArrowSize}px`);
  --gap-size: v-bind(`${expandedGap}px`);

  position: relative;
  display: inline-block;
  transform: translate(-50%, calc(-1 * var(--border-width)));

  &:not(.hoverable) {
    pointer-events: none;
  }

  &.top {
    padding-bottom: var(--gap-size);
    transform: translate(-50%, calc(-100% + var(--border-width)));
  }

  &.bottom {
    padding-top: var(--gap-size);
  }

  & .scroller {
    position: relative;
    padding: 8px 10px 10px;
    overflow-y: auto;
    font-family: "Roboto Condensed", sans-serif;
    font-size: 13px;
    line-height: 19px;

    & .title {
      font-weight: 700;
      line-height: 19px;
    }

    & .text {
      overflow-wrap: anywhere;
    }

    & .title,
    & .text,
    & .resolutions {
      max-width: 350px;
    }

    & .issue,
    & .resolutions {
      margin-top: 20px;
    }

    & .issue {
      font-family: "Roboto Mono", sans-serif;
      font-size: 11px;
      font-weight: 400;
      line-height: 13px;
      white-space: pre-wrap;
    }

    & .resolutions {
      font-size: 13px;
      font-weight: 500;
      line-height: 18px;

      & ul {
        padding-left: 15px;
        margin: 0;
        font-weight: 400;
      }
    }

    & p {
      margin: 0;
    }
  }

  & .wrap-arrow {
    position: relative;
    border: var(--border-width) solid;
    box-shadow: 0 0 10px rgb(62 58 57 / 30%);
  }

  &.top .wrap-arrow::after,
  &.bottom .wrap-arrow::before {
    position: absolute;
    left: 50%;
    width: var(--arrow-size);
    height: var(--arrow-size);
    content: "";
    border: var(--border-width) solid;
    border-bottom-color: transparent;
    border-left-color: transparent;
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
      border-color: v-bind("$colors.warning");
      border-radius: 1px;

      &::after,
      &::before {
        background-color: white;
        border-color: v-bind("$colors.warning");
      }
    }

    & .scroller {
      background-color: white;
    }
  }

  &.error {
    color: var(--knime-masala);

    & .wrap-arrow {
      border-color: v-bind("$colors.error");
      border-radius: 1px;

      &::after,
      &::before {
        background-color: white;
        border-color: v-bind("$colors.error");
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
        background-color: var(--knime-masala);
        border-color: var(--knime-masala);
      }
    }

    & .scroller {
      padding: 2px 6px 4px;
      background-color: var(--knime-masala);
    }
  }
}
</style>
