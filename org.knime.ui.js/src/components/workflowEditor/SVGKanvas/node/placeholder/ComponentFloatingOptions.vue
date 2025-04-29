<script setup lang="ts">
import CloseIcon from "@knime/styles/img/icons/cancel-execution.svg";
import ReExecutionIcon from "@knime/styles/img/icons/reexecution.svg";

import { useComponentInteractionsStore } from "@/store/workflow/componentInteractions";
import * as $shapes from "@/style/shapes";

type Props = {
  id: string;
  isError: boolean;
};

const props = defineProps<Props>();

const { cancelOrRetryComponentLoading } = useComponentInteractionsStore();

const onClick = () => {
  cancelOrRetryComponentLoading({
    placeholderId: props.id,
    action: props.isError ? "retry" : "cancel",
  });
};
</script>

<template>
  <g
    class="floating-button"
    :transform="`translate(${$shapes.nodeSize / 2}, ${-(
      $shapes.nodeSize + $shapes.nodeNameMargin
    )})`"
    @click.left.stop="onClick"
  >
    <circle r="9.5" />
    <Component
      :is="isError ? ReExecutionIcon : CloseIcon"
      width="10"
      height="10"
      x="-5"
      y="-5"
    />
  </g>
</template>

<style scoped>
.floating-button {
  & circle {
    fill: white;
    stroke: var(--knime-silver-sand);
    cursor: pointer;

    &:hover {
      fill: var(--knime-masala);
      stroke: var(--knime-masala);
    }

    &:active {
      fill: var(--knime-black);
      filter: none;
      stroke: var(--knime-black);
    }
  }

  & :deep(svg) {
    stroke-width: calc(32px / 10);
    stroke: var(--knime-masala);
    pointer-events: none;
  }

  &:hover :deep(svg) {
    stroke: var(--knime-white);
  }

  &:active :deep(svg) {
    stroke: var(--knime-white);
  }
}
</style>
