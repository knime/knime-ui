<script setup lang="ts">
import CircleCloseFilledIcon from "@knime/styles/img/icons/circle-close_filled.svg";

import * as $shapes from "@/style/shapes";
import NodeNameText from "../name/NodeNameText.vue";

type Props = {
  name?: string;
};

defineProps<Props>();

const errorIconSize = 15;
</script>

<template>
  <g>
    <NodeNameText :editable="false" :value="name" />

    <CircleCloseFilledIcon
      :x="($shapes.nodeSize - errorIconSize) / 2"
      :y="($shapes.nodeSize - errorIconSize) / 2"
      class="error-icon"
      :width="errorIconSize"
      :height="errorIconSize"
    />

    <rect
      :width="$shapes.nodeSize"
      :height="$shapes.nodeSize"
      :stroke="$colors.error"
      fill="none"
      :stroke-width="$shapes.selectedNodeStrokeWidth"
      :rx="$shapes.nodeTorsoRadius"
    />
  </g>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.error-icon {
  @mixin svg-icon-size v-bind("errorIconSize");

  user-select: none;
}
</style>
