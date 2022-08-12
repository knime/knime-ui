<script>
import { mapState } from 'vuex';
import ArrowDown from '~/webapps-common/ui/assets/img/icons/arrow-down.svg';

export default {
    components: {
        ArrowDown
    },
    computed: {
        ...mapState('canvas', ['containerSize']),
        bounds() {
            const { height, width } = this.containerSize;

            // When showing this empty workflow, the origin (0,0) is exactly in the center of the canvas
            return {
                left: -width / 2,
                top: -height / 2,
                width,
                height
            };
        },
        rectangleBounds() {
            const padding = 25;
            
            return {
                left: this.bounds.left + padding,
                top: this.bounds.top + padding,
                height: this.bounds.height - 2 * padding,
                width: this.bounds.width - 2 * padding
            };
        }
    }
};
</script>

<template>
  <g>
    <rect
      :x="rectangleBounds.left"
      :y="rectangleBounds.top"
      :width="rectangleBounds.width"
      :height="rectangleBounds.height"
    />
    <ArrowDown
      height="64"
      width="64"
      x="-32"
      y="-99"
    />
    <text y="-9">Start building your workflow by</text>
    <text y="27">dropping your nodes here.</text>
  </g>
</template>

<style lang="postcss" scoped>
rect {
  fill: none;
  stroke-width: 3;
  stroke: var(--knime-gray-dark-semi);
  stroke-linecap: square;
  stroke-dasharray: 9 19;
}

svg {
  stroke: var(--knime-masala);
}

text {
  dominant-baseline: middle;
  text-anchor: middle;
  fill: var(--knime-masala);
  font-family: "Roboto Condensed", sans-serif;
  font-weight: normal;
  font-size: 24px;
  user-select: none;
}
</style>
