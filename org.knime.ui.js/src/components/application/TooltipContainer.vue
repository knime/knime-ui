<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getKanvasDomElement } from "@/util/getKanvasDomElement";

import Tooltip from "./Tooltip.vue";

/**
 * Controller for knime-ui tooltips
 * Reacts to changes on workflow/tooltip
 * Handles positioning, accounts for zoom & scroll
 * Closes tooltip when mouse leaves
 * Prevents native browser zooming by catching Ctrl-Wheel events
 */
const position = ref<XY>();

const canvasStore = useCurrentCanvasStore();
const workflowStore = useWorkflowStore();
const { tooltip } = storeToRefs(workflowStore);

/*
 * The gap has to grow with the zoomFactor.
 * Using the square root gives a more appropriate visual impression for larger factors
 */
const zoomedGap = computed(() => {
  return Math.sqrt(canvasStore.value.zoomFactor) * (tooltip.value?.gap ?? 0);
});
const setPosition = () => {
  if (!tooltip.value) {
    // eslint-disable-next-line no-undefined
    position.value = undefined;
    return;
  }

  // get coordinates relative to kanvas' bounds
  let { anchorPoint = { x: 0, y: 0 }, position: currentPosition } =
    tooltip.value;
  position.value = canvasStore.value.screenFromCanvasCoordinates({
    x: anchorPoint.x + currentPosition.x,
    y: anchorPoint.y + currentPosition.y,
  });
};

// TODO NXT-3411 verify if this can even happen
const onCanvasScroll = () => {
  consola.trace("scrolling canvas while tooltip is open");
  setPosition();
};

const openTooltip = () => {
  consola.trace("add kanvas scroll listener for tooltips");

  let kanvas = getKanvasDomElement();
  kanvas?.addEventListener("scroll", onCanvasScroll);
};

const closeTooltip = () => {
  consola.trace("remove kanvas scroll listener for tooltips");

  let kanvas = getKanvasDomElement();
  // if kanvas currently exists (workflow is open) remove scroll event listener
  kanvas?.removeEventListener("scroll", onCanvasScroll);
};

// TODO NXT-3411 verify if this can even happen
const onMouseLeave = () => {
  // trigger closing tooltip
  workflowStore.setTooltip(null);
};

watch(tooltip, (newTooltip, oldTooltip) => {
  if (!oldTooltip) {
    setPosition();
    openTooltip();
  } else if (!newTooltip) {
    closeTooltip();
  }
});

onBeforeUnmount(() => {
  // clean up event listeners
  closeTooltip();
});
</script>

<template>
  <div class="tooltip-container">
    <transition name="tooltip">
      <Tooltip
        v-if="tooltip"
        :x="position?.x"
        :y="position?.y"
        :gap="zoomedGap"
        :text="tooltip.text"
        :title="tooltip.title"
        :issue="tooltip.issue"
        :resolutions="tooltip.resolutions"
        :orientation="tooltip.orientation"
        :hoverable="tooltip.hoverable"
        :type="tooltip.type"
        @mouseleave="onMouseLeave"
        @wheel.ctrl.prevent
      />
    </transition>
  </div>
</template>

<style lang="postcss" scoped>
.tooltip-container {
  z-index: v-bind("$zIndices.layerCanvasTooltips");
  position: fixed;
  top: 0;
  height: 0;

  & .tooltip-enter-active {
    transition: opacity 150ms ease;
  }

  & .tooltip-leave-active {
    transition: opacity 150ms ease;
  }

  & .tooltip-enter,
  & .tooltip-leave-to {
    opacity: 0;
  }
}
</style>
