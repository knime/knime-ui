<script>
import { mapGetters } from 'vuex';
import ArrowDown from '~/webapps-common/ui/assets/img/icons/arrow-down.svg?inline';

export default {
    components: {
        ArrowDown
    },
    computed: {
        ...mapGetters('canvas', ['viewBox']),
        style() {
            /* eslint-disable no-magic-numbers */
            // for styling purposes only
            const { height, width } = this.viewBox;
            const centerX = width * 0.25;
            const centerY = height * 0.2;

            return {
                rectWidth: (width * 0.5) - 50,
                rectHeight: (height * 0.5) - 48,
                iconPosX: centerX - 32,
                iconPosY: centerY - 30,
                textPosX: centerX,
                textPosY: centerY + 90,
                spanPosY: centerY + 126,
                topPos: height * -0.25,
                leftPos: width * -0.25
            };
            /* eslint-enable no-magic-numbers */
        }
    }
};
</script>

<template>
  <g :transform="`translate(${style.leftPos}, ${style.topPos})`">
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
  user-select: none;
}
</style>
