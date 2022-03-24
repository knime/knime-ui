<script>
import { mapGetters } from 'vuex';
import ArrowDownload from '~/webapps-common/ui/assets/img/icons/arrow-download.svg?inline';

export default {
    components: {
        ArrowDownload
    },
    computed: {
        ...mapGetters('canvas', ['canvasSize'])
    }
};
</script>

<template>
  <g>
    <rect
      x="20"
      y="20"
      fill="none"
      stroke-width="5"
      stroke="var(--knime-gray-dark-semi)"
      stroke-linecap="square"
      stroke-dasharray="50,20"
      :width="canvasSize.width - 40"
      :height="canvasSize.height - 40"
    />
    <ArrowDownload
      height="100px"
      width="100px"
      stroke="var(--knime-masala)"
      :x="(canvasSize.width * 0.5) - 50"
      :y="canvasSize.height * 0.3"
    />
    <g
      class="text"
      dominant-baseline="middle"
      text-anchor="middle"
    >
      <text
        :x="canvasSize.width * 0.5"
        :y="(canvasSize.height * 0.4) + 100"
      >
        Start building your workflow by
        <tspan
          :x="canvasSize.width * 0.5"
          :y="(canvasSize.height * 0.4) + 150"
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
  font-size: 36px;
}
</style>
