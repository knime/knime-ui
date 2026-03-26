<script setup lang="ts">
import { computed, useTemplateRef, watch } from "vue";
import { arrow, autoUpdate, offset, useFloating } from "@floating-ui/vue";
import { storeToRefs } from "pinia";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { markPointerEventAsHandled } from "../util/interaction";

import { useTooltipState } from "./useTooltipState";

const { element, config, isHoverableTooltipHovered, hide, isShown } =
  useTooltipState();

const canvasStore = useWebGLCanvasStore();
const { zoomFactor, canvasOffset } = storeToRefs(canvasStore);

const anchorPoint = computed(() => {
  if (!element.value) {
    return { x: 0, y: 0 };
  }

  const elementBounds = element.value.getBounds();
  const elementHeightOffset =
    config.value?.orientation === "bottom" ? elementBounds.height : 0;
  const [canvasX, canvasY] = canvasStore.toCanvasCoordinates([
    elementBounds.x,
    elementBounds.y + elementHeightOffset,
  ]);
  return { x: canvasX, y: canvasY };
});

const reference = computed(() => ({
  getBoundingClientRect() {
    if (!config.value) {
      return new DOMRect();
    }
    const position = canvasStore.screenFromCanvasCoordinates({
      x: anchorPoint.value.x + config.value.position.x,
      y: anchorPoint.value.y + config.value.position.y,
    });
    return new DOMRect(position.x, position.y, 0, 0);
  },
}));

const arrowSize = 8;

/*
 * The gap has to grow with the zoomFactor.
 * Using the square root gives a more appropriate visual impression for larger factors
 */
const gap = computed(
  () =>
    Math.sqrt(canvasStore.zoomFactor) * (config.value?.gap ?? 0) + arrowSize,
);

const desiredPlacement = computed(() => config.value?.orientation);

const floating = useTemplateRef("floating");
const floatingArrow = useTemplateRef("floatingArrow");
const { floatingStyles, middlewareData, placement } = useFloating(
  reference,
  floating,
  {
    placement: desiredPlacement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(() => gap.value), arrow({ element: floatingArrow })],
  },
);

// hide tooltip if element was removed
watch(element, (el) => {
  if (!el) {
    consola.debug("Tooltip: element got removed, remove tooltip");
    hide();
  }
});

// hide tooltip when user does pan or zoom
watch(
  [zoomFactor, canvasOffset],
  () => {
    hide();
  },
  { deep: true },
);

const onPointerEnter = () => {
  isHoverableTooltipHovered.value = Boolean(config.value?.hoverable);
};

const onPointerLeave = () => {
  hide();
};

// avoid any interaction with the canvas if you are on the tooltip (e.g. open quick menu)
const onPointerDown = (event: PointerEvent) => {
  if (config.value?.hoverable) {
    markPointerEventAsHandled(event, { initiator: "tooltip" });
  }
};
</script>

<template>
  <transition name="tooltip">
    <div
      v-if="isShown && config"
      ref="floating"
      :class="[
        'tooltip-container',
        config.type,
        { hoverable: config.hoverable },
      ]"
      :style="floatingStyles"
      data-is-tooltip="true"
      data-test-id="tooltip"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @pointerdown="onPointerDown"
      @wheel.ctrl.prevent
    >
      <div
        ref="floatingArrow"
        :class="['tooltip-arrow', placement]"
        :style="{ left: `${middlewareData.arrow?.x ?? 0}px` }"
      >
        <div class="tooltip-arrow-inner" />
      </div>
      <div v-if="config.title" class="title">
        {{ config.title }}
      </div>
      <p v-if="config.text" class="text">
        {{ config.text }}
      </p>
      <div v-if="config.issue" class="issue">
        {{ config.issue }}
      </div>
      <div v-if="config.resolutions?.length" class="resolutions">
        Potential resolutions:
        <ul>
          <li v-for="res in config.resolutions" :key="res">
            {{ res }}
          </li>
        </ul>
      </div>
    </div>
  </transition>
</template>

<style lang="postcss" scoped>
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 150ms ease;
}

.tooltip-enter,
.tooltip-leave-to {
  opacity: 0;
}

.tooltip-container {
  z-index: v-bind("$zIndices.layerCanvasTooltips");
  max-width: 370px;
  padding: var(--space-4) var(--space-8);
  font-family: "Roboto Condensed", sans-serif;
  font-size: 13px;
  color: var(--knime-white);
  background-color: var(--knime-masala);
  box-shadow: 0 0 10px rgb(62 58 57 / 30%);

  &:not(.hoverable) {
    pointer-events: none;
  }

  & .title {
    font-weight: 700;
    line-height: 19px;
  }

  & .text {
    overflow-wrap: anywhere;
  }

  & .issue,
  & .resolutions {
    margin-top: 20px;
  }

  & .issue {
    font-family: "Roboto Mono", sans-serif;
    font-size: 11px;
    font-weight: 400;
    line-height: 13px;
    white-space: pre-wrap;
  }

  & .resolutions {
    font-size: 13px;
    font-weight: 500;
    line-height: 18px;

    & ul {
      padding-left: 15px;
      margin: 0;
      font-weight: 400;
    }
  }

  & p {
    margin: 0;
  }

  & .tooltip-arrow {
    --arrow-size: v-bind(arrowSize + "px");

    position: absolute;
    width: 0;
    height: 0;

    & .tooltip-arrow-inner {
      position: absolute;
      left: calc(var(--arrow-size) * -1);
      width: 0;
      height: 0;
      border-right: var(--arrow-size) solid transparent;
      border-left: var(--arrow-size) solid transparent;
    }

    &.bottom {
      top: calc(var(--arrow-size) * -1);
      border-right: var(--arrow-size) solid transparent;
      border-bottom: var(--arrow-size) solid var(--knime-masala);
      border-left: var(--arrow-size) solid transparent;
    }

    &.top {
      bottom: calc(var(--arrow-size) * -1);
      border-top: var(--arrow-size) solid var(--knime-masala);
      border-right: var(--arrow-size) solid transparent;
      border-left: var(--arrow-size) solid transparent;
    }
  }

  &.warning {
    padding: var(--space-8);
    color: var(--knime-masala);
    background-color: var(--knime-white);
    border: 1px solid v-bind("$colors.warning");

    & .tooltip-arrow {
      &.bottom {
        border-bottom: var(--arrow-size) solid v-bind("$colors.warning");

        & .tooltip-arrow-inner {
          top: 1px;
          border-bottom: var(--arrow-size) solid var(--knime-white);
        }
      }

      &.top {
        border-top: var(--arrow-size) solid v-bind("$colors.warning");

        & .tooltip-arrow-inner {
          bottom: 1px;
          border-top: var(--arrow-size) solid var(--knime-white);
        }
      }
    }
  }

  &.error {
    padding: var(--space-8);
    color: var(--knime-masala);
    background-color: var(--knime-white);
    border: 1px solid v-bind("$colors.error");

    & .tooltip-arrow {
      &.bottom {
        border-bottom: var(--arrow-size) solid v-bind("$colors.error");

        & .tooltip-arrow-inner {
          top: 1px;
          border-bottom: var(--arrow-size) solid var(--knime-white);
        }
      }

      &.top {
        border-top: var(--arrow-size) solid v-bind("$colors.error");

        & .tooltip-arrow-inner {
          bottom: 1px;
          border-top: var(--arrow-size) solid var(--knime-white);
        }
      }
    }
  }
}
</style>
