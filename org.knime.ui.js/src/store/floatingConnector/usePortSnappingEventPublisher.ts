import { type Ref, watch } from "vue";

import { $bus } from "@/plugins/event-bus";

import {
  type SnapTarget,
  type SnappedPlaceholderPort,
  type SnappedPort,
  isPlaceholderPort,
} from "./types";

export const usePortSnappingEventPublisher = (
  snapTarget: Ref<SnapTarget | undefined>,
) => {
  const pushUpdateToSnappedPort = (
    target: SnappedPort,
    type: "active" | "inactive",
  ) => {
    const { parentNodeId, index, side } = target;
    $bus.emit(`connector-snap-${type}_${parentNodeId}__${side}__${index}`, {
      snapTarget: target,
    });
  };

  const pushUpdateToSnappedPlaceholderPort = (
    target: SnappedPlaceholderPort,
    type: "active" | "inactive",
  ) => {
    const { parentNodeId, side } = target;
    $bus.emit(`connector-snap-${type}-placeholder_${parentNodeId}__${side}`, {
      snapTarget: target,
    });
  };

  // Directly dispatch event to the node port that is being targeted
  watch(snapTarget, (next, prev) => {
    if (prev) {
      if (isPlaceholderPort(prev)) {
        pushUpdateToSnappedPlaceholderPort(prev, "inactive");
      } else {
        pushUpdateToSnappedPort(prev, "inactive");
      }
    }

    if (next) {
      if (isPlaceholderPort(next)) {
        pushUpdateToSnappedPlaceholderPort(next, "active");
      } else {
        pushUpdateToSnappedPort(next, "active");
      }
    }
  });
};
