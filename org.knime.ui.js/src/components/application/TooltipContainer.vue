<script>
import { mapActions, mapState } from "pinia";

import { useCanvasStore } from "@/store/canvas";
import { useWorkflowStore } from "@/store/workflow/workflow";

import Tooltip from "./Tooltip.vue";

/**
 * Controller for knime-ui tooltips
 * Reacts to changes on workflow/tooltip
 * Handles positioning, accounts for zoom & scroll
 * Closes tooltip when mouse leaves
 * Prevents native browser zooming by catching Ctrl-Wheel events
 */
export default {
  components: {
    Tooltip,
  },
  data: () => ({
    position: null,
  }),
  computed: {
    ...mapState(useWorkflowStore, ["tooltip"]),
    ...mapState(useCanvasStore, ["zoomFactor", "screenFromCanvasCoordinates"]),
    /*
      The gap has to grow with the zoomFactor.
      Using the square root gives a more appropriate visual impression for larger factors
    */
    zoomedGap() {
      return Math.sqrt(this.zoomFactor) * (this.tooltip.gap || 0);
    },
  },
  watch: {
    tooltip(newTooltip, oldTooltip) {
      if (!oldTooltip) {
        this.setPosition();
        this.openTooltip();
      } else if (!newTooltip) {
        this.closeTooltip();
      }
    },
  },
  beforeUnmount() {
    // clean up event listeners
    this.closeTooltip();
  },
  methods: {
    ...mapActions(useWorkflowStore, ["setTooltip"]),
    setPosition() {
      if (!this.tooltip) {
        this.position = null;
        return;
      }

      // get coordinates relative to kanvas' bounds
      let { anchorPoint = { x: 0, y: 0 }, position } = this.tooltip;
      this.position = this.screenFromCanvasCoordinates({
        x: anchorPoint.x + position.x,
        y: anchorPoint.y + position.y,
      });
    },
    openTooltip() {
      consola.trace("add kanvas scroll listener for tooltips");

      let kanvas = document.getElementById("kanvas");
      kanvas.addEventListener("scroll", this.onCanvasScroll);
    },
    closeTooltip() {
      consola.trace("remove kanvas scroll listener for tooltips");

      let kanvas = document.getElementById("kanvas");
      // if kanvas currently exsists (workflow is open) remove scroll event listener
      kanvas?.removeEventListener("scroll", this.onCanvasScroll);
    },
    onMouseLeave() {
      // trigger closing tooltip
      this.setTooltip(null);
    },
    onCanvasScroll() {
      consola.trace("scrolling canvas while tooltip is open");
      this.setPosition();
    },
  },
};
</script>

<template>
  <div class="tooltip-container">
    <transition name="tooltip">
      <Tooltip
        v-if="tooltip"
        :x="position.x"
        :y="position.y"
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
