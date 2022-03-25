<script>
import { mapGetters } from 'vuex';
import ArrowDown from '~/webapps-common/ui/assets/img/icons/arrow-down.svg?inline';

export default {
    components: {
        ArrowDown
    },
    computed: {
        ...mapGetters('canvas', ['canvasSize'])
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
      :width="canvasSize.width - 48"
      :height="canvasSize.height - 48"
    />
    <ArrowDown
      height="64px"
      width="64px"
      stroke="var(--knime-masala)"
      :x="(canvasSize.width * 0.5) - 32"
      :y="canvasSize.height * 0.38"
    />
    <g
      class="text"
      dominant-baseline="middle"
      text-anchor="middle"
    >
      <text
        :x="canvasSize.width * 0.5"
        :y="(canvasSize.height * 0.4) + 90"
      >
        Start building your workflow by
        <tspan
          :x="canvasSize.width * 0.5"
          :y="(canvasSize.height * 0.4) + 126"
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
