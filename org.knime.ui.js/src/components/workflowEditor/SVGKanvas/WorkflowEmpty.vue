<script setup lang="ts">
import { computed } from "vue";

import { KdsButton } from "@knime/kds-components";
import ArrowDownIcon from "@knime/styles/img/icons/arrow-down.svg";
import CircleInfoIcon from "@knime/styles/img/icons/circle-info.svg";

import { useAddNodeViaFileUpload } from "@/components/nodeTemplates/useAddNodeViaFileUpload";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import { isBrowser } from "@/environment";
import { useShortcuts } from "@/services/shortcuts";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useUIControlsStore } from "@/store/uiControls/uiControls";

import WorkflowPortalLayers from "./WorkflowPortalLayers.vue";

const uiControls = useUIControlsStore();

const bounds = computed(() => {
  const canvasStore = useCurrentCanvasStore();
  const { containerSize } = canvasStore.value;
  const { height, width } = containerSize;

  // When showing this empty workflow, the origin (0,0) is exactly in the center of the canvas
  return {
    left: -width / 2,
    top: -height / 2,
    width,
    height,
  };
});

const rectangleBounds = computed(() => {
  const padding = 25;

  return {
    left: bounds.value.left + padding,
    top: bounds.value.top + padding,
    height: Math.max(bounds.value.height - 2 * padding, 0),
    width: Math.max(bounds.value.width - 2 * padding, 0),
  };
});

const { importFilesViaDialog } = useAddNodeViaFileUpload();
const $shortcuts = useShortcuts();
const dispatchShortcut = (
  shortcutName: "openQuickNodeInsertionMenu" | "openQuickBuildMenu",
  event: MouseEvent,
) => {
  const [x, y] = useCurrentCanvasStore().value.screenToCanvasCoordinates([
    event.clientX,
    event.clientY,
  ]);

  if ($shortcuts.isEnabled(shortcutName)) {
    $shortcuts.dispatch(shortcutName, {
      event,
      metadata: { position: { x, y } },
    });
  }
};

const { isKaiEnabled } = useIsKaiEnabled();
</script>

<template>
  <g>
    <rect
      :x="rectangleBounds.left"
      :y="rectangleBounds.top"
      :width="rectangleBounds.width"
      :height="rectangleBounds.height"
      :class="{ dashed: uiControls.canEditWorkflow }"
    />

    <Component
      :is="uiControls.canEditWorkflow ? ArrowDownIcon : CircleInfoIcon"
      height="64"
      width="64"
      x="-32"
      y="-99"
    />

    <template v-if="uiControls.canEditWorkflow">
      <text y="-9">Start building your workflow by dropping</text>
      <text y="27"> your data or nodes here.</text>
    </template>

    <template v-else>
      <text y="0">This workflow is empty.</text>
    </template>

    <foreignObject
      v-if="uiControls.canEditWorkflow && isBrowser()"
      y="50"
      x="-250"
      style="height: 100px; width: 500px"
    >
      <div
        style="
          display: flex;
          padding-top: var(--kds-spacing-container-1x);
          gap: var(--kds-spacing-container-0-75x);
          justify-content: center;
        "
      >
        <KdsButton
          label="Data file"
          size="large"
          leading-icon="plus"
          variant="outlined"
          @click="importFilesViaDialog"
        />
        <KdsButton
          label="Add node"
          size="large"
          leading-icon="node-stack"
          variant="outlined"
          @click="dispatchShortcut('openQuickNodeInsertionMenu', $event)"
        />
        <KdsButton
          v-if="isKaiEnabled"
          label="Ask K-AI"
          leading-icon="ai-general"
          size="large"
          variant="outlined"
          @click="dispatchShortcut('openQuickBuildMenu', $event)"
        />
      </div>
    </foreignObject>

    <!-- Define all Portals also for the empty workflow because some features rely on them -->
    <WorkflowPortalLayers v-if="uiControls.canEditWorkflow" />
  </g>
</template>

<style lang="postcss" scoped>
rect {
  fill: none;

  &.dashed {
    stroke-width: 3;
    stroke: var(--knime-gray-dark-semi);
    stroke-linecap: square;
    stroke-dasharray: 9 19;
  }
}

svg {
  stroke: var(--knime-masala);
}

text {
  dominant-baseline: middle;
  text-anchor: middle;
  fill: var(--knime-masala);
  font-family: "Roboto Condensed", sans-serif;
  font-weight: normal;
  font-size: 24px;
  user-select: none;
}
</style>
