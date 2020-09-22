<script>
import { mapGetters } from 'vuex';

export default {
    props: {
        text: {
            type: [String, Number],
            default: ''
        },
        title: {
            type: String,
            default: null
        },
        anchor: {
            type: Object,
            default: null
        },
        x: {
            type: Number,
            default: 0
        },
        y: {
            type: Number,
            default: 0
        },
        type: {
            type: String,
            default: 'default',
            validator: type => ['error', 'warning', 'default'].includes(type)
        },
        orientation: {
            type: String,
            default: 'bottom',
            validator: orientation => ['bottom', 'top'].includes(orientation)
        }
    },
    computed: {
        ...mapGetters('workflows', ['getAbsoluteCoordinates', 'nodes']),
        position() {
            let { x, y } = this;

            if (this.anchor && this.anchor.node) {
                const node = this.nodes[this.anchor.node];
                const absPos = this.getAbsoluteCoordinates(node.position.x, node.position.y);
                x += absPos.x;
                y += absPos.y;
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
      '--arrowMargin': `${$shapes.portSize / 2}px`,
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
  position: relative;
  text-align: justify;
  display: inline-block;
  font-family: "Roboto Condensed", sans-serif;
  user-select: none;
  font-size: 10px;
  padding: 4px 5px;
  box-shadow: 0 0 10px rgba(62, 58, 57, 0.3);
  z-index: 1;
  transform: translate(-50%, var(--arrowMargin));

  &.top {
    transform: translate(-50%, calc(-100% - var(--arrowMargin)));
  }

  & .title {
    font-weight: bold;
    line-height: 12px;
    margin-bottom: 1px;
  }

  &.default {
    color: white;
    background-color: var(--knime-masala);
    border: 1px solid var(--knime-masala);

    &::before,
    &::after {
      border: 1px solid var(--knime-masala);
      background-color: var(--knime-masala);
    }
  }

  &.error {
    color: var(--knime-masala);
    border-radius: 1px;
    background-color: white;
    border: 1px solid var(--knime-error);

    &::before,
    &::after {
      border: 1px solid var(--knime-error);
      background-color: white;
    }
  }

  &.warning {
    color: var(--knime-masala);
    border-radius: 1px;
    background-color: white;
    border: 1px solid var(--knime-warning);

    &::after,
    &::before {
      border: 1px solid var(--knime-warning);
      background-color: white;
    }
  }

  &.top::after,
  &.bottom::before {
    width: calc(var(--arrowSize) - 2px);
    height: calc(var(--arrowSize) - 2px);
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
