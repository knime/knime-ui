<script>
import { mapGetters } from 'vuex';
import ArrowDown from '~/webapps-common/ui/assets/img/icons/arrow-down.svg?inline';

export default {
    components: {
        ArrowDown
    },
    computed: {
        ...mapGetters('canvas', ['canvasSize']),
        style() {
            const { height, width } = this.canvasSize;
            /* eslint-disable no-magic-numbers */
            // for styling purposes only
            const centerX = width * 0.5;
            const centerY = height * 0.4;

            return {
                rectWidth: width - 48,
                rectHeight: height - 48,
                iconPosX: centerX - 32,
                iconPosY: height * 0.38,
                textPosX: centerX,
                textPosY: centerY + 90,
                spanPosY: centerY + 126
            };
            /* eslint-enable no-magic-numbers */
        }
    }
};
</script>

<template>
  <g>
    <rect
      x="24"
      y="24"
      fill="none"
      stroke-width="3"
      stroke="var(--knime-gray-dark-semi)"
      stroke-linecap="square"
      stroke-dasharray="9,19"
      :width="style.rectWidth"
      :height="style.rectHeight"
    />
    <ArrowDown
      height="64px"
      width="64px"
      stroke="var(--knime-masala)"
      :x="style.iconPosX"
      :y="style.iconPosY"
    />
    <g
      class="text"
      dominant-baseline="middle"
      text-anchor="middle"
    >
      <text
        :x="style.textPosX"
        :y="style.textPosY"
      >
        Start building your workflow by
        <tspan
          :x="style.textPosX"
          :y="style.spanPosY"
        >
          dropping your nodes here.
        </tspan>
      </text>
    </g>
  </g>
</template>

<style lang="postcss" scoped>
.text {
  fill: var(--knime-masala);
  font-family: "Roboto Condensed", sans-serif;
  font-weight: normal;
  font-size: 24px;
}
</style>
