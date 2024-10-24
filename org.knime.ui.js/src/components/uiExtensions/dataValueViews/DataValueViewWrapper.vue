<script setup lang="ts">
import { computed, ref } from "vue";
import {
  type ClientRectObject,
  arrow,
  autoPlacement,
  autoUpdate,
  offset,
  shift,
  useFloating,
} from "@floating-ui/vue";

import DataValueViewLoader, {
  type Props as DataValueViewLoaderProps,
} from "./DataValueViewLoader.vue";

export type Props = DataValueViewLoaderProps & {
  anchor: ClientRectObject;
};

const props = defineProps<Props>();
const dataValueViewElement = ref();
const dataValueViewArrow = ref();

const { floatingStyles, middlewareData, placement } = useFloating(
  computed(() => ({ getBoundingClientRect: () => props.anchor })),
  dataValueViewElement,
  {
    placement: "top",
    strategy: "fixed",
    middleware: [
      offset(18),
      shift(),
      autoPlacement({
        allowedPlacements: ["top", "bottom"],
      }),
      arrow({ element: dataValueViewArrow }),
    ],
    whileElementsMounted: autoUpdate,
  },
);
</script>

<template>
  <div
    ref="dataValueViewElement"
    class="data-value-view-element"
    :style="floatingStyles"
  >
    <DataValueViewLoader
      class="data-value-view-loader"
      :project-id="projectId"
      :workflow-id="workflowId"
      :node-id="nodeId"
      :selected-port-index="selectedPortIndex"
      :selected-row-index="selectedRowIndex"
      :selected-col-index="selectedColIndex"
    />
    <div
      ref="dataValueViewArrow"
      :class="[
        'data-value-view-arrow',
        {
          top: placement === 'bottom',
          bottom: placement !== 'bottom',
        },
      ]"
      :style="{
        left:
          middlewareData.arrow?.x != null ? `${middlewareData.arrow.x}px` : '',
        top: middlewareData.arrow?.y != null ? `${middlewareData.arrow.y}` : '',
      }"
    />
  </div>
</template>

<style lang="postcss" scoped>
.data-value-view-element {
  z-index: 20;
  border-radius: 8px;
  width: 720px;
  height: 400px;
  background-color: var(--knime-porcelain);
  box-shadow: var(--shadow-elevation-2);
  padding: var(--space-8);

  & .data-value-view-loader {
    border-radius: 8px;
  }

  & .data-value-view-arrow {
    position: fixed;
    width: 0;
    height: 0;
    border-left: 14px solid transparent;
    border-right: 14px solid transparent;
    pointer-events: none;

    &.top {
      top: -14px;
      border-bottom: 14px solid var(--knime-porcelain);
    }

    &.bottom {
      bottom: -14px;
      border-top: 14px solid var(--knime-porcelain);
    }
  }
}
</style>
