// This feature needs to share state across a drag interaction. This normally involves multiple
// handlers which are not bound or called at the same location in the code (e.g dragStart, onDrag, onDrop, etc)
// For this reason, any shared state has to be defined at module scope so that any code
// using the drag interaction can consistently read it. This is also stable since only one drag interaction
// can occur at a time

import { ref } from "vue";

import type {
  ComponentNodeTemplateWithExtendedPorts,
  NodeTemplateWithExtendedPorts,
} from "@/lib/data-mappers";

import type { CallbackKeys, Callbacks } from "./types";

const DRAG_TO_EDGE_BUFFER_MS = 300;
let dragStartTime: number | null = null;

export const dragTime = {
  isSet: () => dragStartTime !== null,
  init: (value: number) => {
    dragStartTime = value;
  },
  get: () => {
    if (!dragStartTime) {
      consola.warn("dragStartTime value needs to be initialized");
      return Infinity;
    }

    return dragStartTime;
  },
  reset: () => (dragStartTime = null),
  exceedsPanningThreshold: () => {
    // skip first few MS of the drag interaction, to avoid panning to the edge when first dragging
    // over the edge of the canvas element
    const elapsedTime = window.performance.now() - dragTime.get();
    return elapsedTime > DRAG_TO_EDGE_BUFFER_MS;
  },
};

const draggedTemplateData = ref<
  NodeTemplateWithExtendedPorts | ComponentNodeTemplateWithExtendedPorts | null
>(null);

const callbacks: Partial<Callbacks> = {};

const scheduleCallback = (
  key: CallbackKeys,
  fn: Required<Callbacks>[CallbackKeys],
) => {
  callbacks[key] = fn;
};

const triggerCallback = (
  key: CallbackKeys,
  ...args: Parameters<Callbacks[CallbackKeys]>
) => {
  callbacks[key]?.(...args);
};

export const useSharedState = () => {
  return {
    dragTime,
    draggedTemplateData,
    callbacks: {
      schedule: scheduleCallback,
      trigger: triggerCallback,
    },
  };
};
