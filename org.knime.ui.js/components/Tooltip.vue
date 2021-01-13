<script>
import { mapGetters } from 'vuex';

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
            default: ''
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
         * Optional: a point on the Kanvas that marks the origin of the tooltips's coordinates.
         * This makes it more conventient to display tooltips e.g. on Nodes, because it allows to pass the node position
         * as `anchorPoint`, and the tooltip's coordinates relitave to the node.
         */
        anchorPoint: {
            type: Object,
            default: () => ({ x: 0, y: 0 }),
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
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
        }
    },
    computed: {
        ...mapGetters('canvas', ['zoomFactor', 'getAbsoluteCoordinates']),
        position() {
            let { $shapes: { tooltipArrowSize } } = this;
            let { x, y } = this.getAbsoluteCoordinates({
                x: this.anchorPoint.x + this.x,
                y: this.anchorPoint.y + this.y
            });

            const arrowHalfDiagonal = Math.SQRT1_2 * tooltipArrowSize;
            if (this.orientation === 'bottom') {
                y += arrowHalfDiagonal;
            } else {
                y -= arrowHalfDiagonal;
            }
            return { x, y };
        }
    }
};
</script>

<template>
  <div
    :class="['wrapper', type, orientation]"
    :style="{
      '--arrowSize': `${$shapes.tooltipArrowSize}px`,
      top: `${position.y}px`,
      left: `${position.x}px`,
      maxWidth: `${$shapes.tooltipMaxWidth}px`
    }"
  >
    <div
      v-if="title"
      class="title"
    >
      {{ title }}
    </div>
    {{ text }}
  </div>
</template>

<style lang="postcss" scoped>
.wrapper {
  --border-width: 1px;

  line-height: initial;
  position: relative;
  text-align: justify;
  display: inline-block;
  font-family: "Roboto Condensed", sans-serif;
  user-select: none;
  font-size: 12px;
  padding: 4px 5px;
  box-shadow: 0 0 10px rgba(62, 58, 57, 0.3);
  z-index: 1;
  border: var(--border-width) solid;
  transform: translate(-50%, calc(-1 * var(--border-width)));

  &.top {
    transform: translate(-50%, calc(-100% + var(--border-width)));
  }

  &::before,
  &::after {
    border: var(--border-width) solid;
    z-index: -1;
  }

  & .title {
    font-weight: bold;
    line-height: 12px;
    margin-bottom: 1px;
  }

  &.default {
    color: white;
    background-color: var(--knime-masala);
    border-color: var(--knime-masala);

    &::before,
    &::after {
      border-color: var(--knime-masala);
      background-color: var(--knime-masala);
    }
  }

  &.error {
    color: var(--knime-masala);
    border-radius: 1px;
    background-color: white;
    border-color: var(--error-color);

    &::before,
    &::after {
      border-color: var(--error-color);
      background-color: white;
    }
  }

  &.warning {
    color: var(--knime-masala);
    border-radius: 1px;
    background-color: white;
    border-color: var(--warning-color);

    &::after,
    &::before {
      border-color: var(--warning-color);
      background-color: white;
    }
  }

  &.top::after,
  &.bottom::before {
    width: var(--arrowSize);
    height: var(--arrowSize);
    content: '';
    position: absolute;
    left: 50%;
    border-left-color: transparent;
    border-bottom-color: transparent;
  }

  &.bottom::before {
    top: 0;
    transform: translate(-50%, -50%) rotate(-45deg);
  }

  &.top::after {
    bottom: 0;
    transform: translate(-50%, 50%) rotate(135deg);
  }
}
</style>
