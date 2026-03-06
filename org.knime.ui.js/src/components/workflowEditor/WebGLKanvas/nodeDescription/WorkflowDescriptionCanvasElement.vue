<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import ArrowMoveIcon from "@knime/styles/img/icons/arrow-move.svg";

import type { XY } from "@/api/gateway-api/generated-api";
import FloatingHTML from "@/components/workflowEditor/WebGLKanvas/common/FloatingHTML.vue";
import WorkflowMetadata from "@/components/workflowMetadata/WorkflowMetadata.vue";
import { workflowDomain } from "@/lib/workflow-domain";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useWorkflowDescriptionPositionStore } from "@/store/workflow/useWorkflowDescriptionPosition";
import { useWorkflowStore } from "@/store/workflow/workflow";

/**
 * A proper canvas-space element displaying the workflow or component metadata.
 * Styled like a locked annotation: cannot be deleted, but can be dragged.
 * Uses WorkflowMetadata for both view and edit — all fields are visible in
 * view mode (description, tags, links, port descriptions, component preview).
 *
 * Positioned via FloatingHTML using PIXI world (canvas) coordinates persisted
 * in useWorkflowDescriptionPositionStore.
 */

const workflowStore = useWorkflowStore();
const { activeWorkflow } = storeToRefs(workflowStore);

const canvasStore = useWebGLCanvasStore();
const positionStore = useWorkflowDescriptionPositionStore();

// ─── Workflow identity ───────────────────────────────────────────────

const workflowKey = computed<string>(() => {
  if (!activeWorkflow.value) {
    return "__default__";
  }
  const { projectId, info } = activeWorkflow.value;
  return `${projectId}::${info.containerId}`;
});

// ─── Canvas position ────────────────────────────────────────────────

const canvasPosition = computed<XY>(() =>
  positionStore.getPosition(workflowKey.value),
);

// ─── Title label ──────────────────────────────────────────────────────

const metadata = computed(() => activeWorkflow.value?.metadata ?? null);

const titleLabel = computed(() => {
  if (metadata.value && workflowDomain.project.isComponentMetadata(metadata.value)) {
    return "Component Description";
  }
  return "Workflow Description";
});

const isVisible = computed(() => Boolean(metadata.value));

// ─── Dragging ─────────────────────────────────────────────────────────────────

const isDragging = ref(false);

const onCardHeaderMouseDown = (event: MouseEvent) => {
  if (!(event.target as HTMLElement).closest(".element-header")) {
    return;
  }
  if ((event.target as HTMLElement).closest("button")) {
    return;
  }

  event.preventDefault();
  isDragging.value = true;

  const screenStart = canvasStore.screenFromCanvasCoordinates(canvasPosition.value);
  const offsetX = event.clientX - screenStart.x;
  const offsetY = event.clientY - screenStart.y;

  const onMove = (e: MouseEvent) => {
    const targetClientX = e.clientX - offsetX;
    const targetClientY = e.clientY - offsetY;
    const [worldX, worldY] = canvasStore.screenToCanvasCoordinates([
      targetClientX,
      targetClientY,
    ]);
    positionStore.setPosition(workflowKey.value, { x: worldX, y: worldY });
  };

  const onUp = () => {
    isDragging.value = false;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
};
</script>

<template>
  <FloatingHTML
    :active="isVisible"
    :canvas-position="canvasPosition"
  >
    <div
      class="workflow-description-canvas-element"
      :class="{ dragging: isDragging }"
    >
      <!-- ── Drag handle ─────────────────────────────────────────────────────── -->
      <div class="element-header" @mousedown="onCardHeaderMouseDown">
        <ArrowMoveIcon class="drag-icon" />
        <span class="element-title">{{ titleLabel }}</span>
      </div>

      <!-- ── Full metadata (view + edit handled by WorkflowMetadata) ────── -->
      <div class="metadata-body">
        <WorkflowMetadata />
      </div>
    </div>
  </FloatingHTML>
</template>

<style lang="postcss" scoped>
.workflow-description-canvas-element {
  display: flex;
  flex-direction: column;
  width: 420px;
  background-color: var(--knime-white);
  border: var(--kds-border-base-subtle);
  border-radius: var(--kds-border-radius-container-0-50x);
  overflow: hidden;
  transform-origin: top left;

  &.dragging * {
    pointer-events: none;
  }
}

/* ── Drag handle ────────────────────────────────────────────────────────── */
.element-header {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 var(--kds-spacing-container-0-50x);
  border-bottom: var(--kds-border-base-subtle);
  background-color: var(--kds-color-background-neutral-default);
  cursor: grab;
  user-select: none;

  .workflow-description-canvas-element.dragging & {
    cursor: grabbing;
  }
}

.drag-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--kds-color-text-and-icon-neutral);
  opacity: 0.5;
}

.element-title {
  font: var(--kds-font-base-title-xsmall);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--kds-color-text-and-icon-neutral);
}

/* ── Metadata body ────────────────────────────────────────────────────────── */
.metadata-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 580px;
  overflow: hidden;

  :deep(.metadata) {
    height: 100%;
  }
}
</style>
