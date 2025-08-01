import {
  type ComputedRef,
  type Ref,
  computed,
  onBeforeUnmount,
  watch,
} from "vue";
import { storeToRefs } from "pinia";

import type { KnimeNode } from "@/api/custom-types";
import { useSelectionStore } from "@/store/selection";
import { getKanvasDomElement } from "@/util/getKanvasDomElement";
import { isInputElement } from "@/util/isInputElement";
import { clamp } from "@/util/math";
import {
  type SelectedPortContext,
  type SelectedPortIdentifier,
  getPortContext,
} from "@/util/portSelection";
import { useNodeInfo } from "../../../common/useNodeInfo";

type Direction = "up" | "right" | "down" | "left";

type UsePortKeyboardNavigationOptions = {
  nodeId: string;
  inPorts: KnimeNode["inPorts"];
  outPorts: KnimeNode["outPorts"];
  onAddPortInput: Ref<(() => void) | undefined>;
  onAddPortOutput: Ref<(() => void) | undefined>;
  canAddPort: ComputedRef<{ input: boolean; output: boolean }>;
  selectedPort: ComputedRef<SelectedPortIdentifier | null>;
  updatePortSelection: (selectedPort: SelectedPortIdentifier) => void;
};

export const usePortKeyboardNavigation = (
  options: UsePortKeyboardNavigationOptions,
) => {
  const { activeNodePorts } = storeToRefs(useSelectionStore());

  const isActiveNodePortsInstance = computed(
    () => activeNodePorts.value.nodeId === options.nodeId,
  );

  const { node, isMetanode } = useNodeInfo({ nodeId: options.nodeId });

  const navigateUp = (current: SelectedPortContext) => {
    const minIndex = isMetanode.value ? 0 : 1;
    const candidateIndex = current.isAddPort
      ? current.sidePorts.length - 1
      : current.index - 1;

    if (candidateIndex >= minIndex && current.sidePorts[candidateIndex]) {
      options.updatePortSelection(`${current.side}-${candidateIndex}`);
    }
  };

  const triggerAddPortMenu = (side: "input" | "output") => {
    if (side === "input") {
      options.onAddPortInput?.value?.();
    } else {
      options.onAddPortOutput?.value?.();
    }
  };

  const navigateDown = (current: SelectedPortContext) => {
    if (current.sidePorts[current.index + 1]) {
      options.updatePortSelection(`${current.side}-${current.index + 1}`);
      return;
    }

    if (options.canAddPort.value[current.side]) {
      if (current.isAddPort) {
        triggerAddPortMenu(current.side);
      } else {
        options.updatePortSelection(`${current.side}-AddPort`);
      }
    }
  };

  const navigateLeftRight = (
    current: SelectedPortContext,
    direction: Direction,
  ) => {
    const isSwap =
      (current.side === "input" && direction === "right") ||
      (current.side === "output" && direction === "left");

    const otherSide = current.side === "input" ? "output" : "input";
    const otherPorts =
      current.side === "input" ? options.outPorts : options.inPorts;

    if (!isSwap) {
      if (current.isAddPort) {
        triggerAddPortMenu(current.side);
      }
      return;
    }

    const minIndex = isMetanode.value ? 0 : 1;
    const equivIndex = clamp(
      current.isAddPort ? current.sidePorts.length : current.index,
      minIndex,
      otherPorts.length - 1,
    );

    if (otherPorts[equivIndex]) {
      options.updatePortSelection(`${otherSide}-${equivIndex}`);
      return;
    }

    if (options.canAddPort.value[otherSide]) {
      options.updatePortSelection(`${otherSide}-AddPort`);
    }
  };

  const navigateSelection = (direction: Direction) => {
    if (!options.selectedPort.value) {
      return;
    }

    const current = getPortContext(node.value, options.selectedPort.value);
    switch (direction) {
      case "up":
        navigateUp(current);
        break;
      case "down":
        navigateDown(current);
        break;
      case "left":
      case "right":
        navigateLeftRight(current, direction);
        break;
      default:
        break;
    }
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (isInputElement(event.target as HTMLElement)) {
      return;
    }

    const direction: Direction | undefined = (
      {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      } as const
    )[event.key];

    if (direction) {
      event.preventDefault();
      navigateSelection(direction);
      return;
    }

    if (
      event.key === "Enter" &&
      options.selectedPort.value?.endsWith("AddPort")
    ) {
      triggerAddPortMenu(
        getPortContext(node.value, options.selectedPort.value).side,
      );
    }
  };

  let hasKeydownListener = false;

  watch(isActiveNodePortsInstance, (isActivated) => {
    if (hasKeydownListener) {
      getKanvasDomElement()?.removeEventListener("keydown", onKeydown);
    }

    if (isActivated) {
      getKanvasDomElement()?.addEventListener("keydown", onKeydown);
      hasKeydownListener = true;
    }
  });

  onBeforeUnmount(() => {
    getKanvasDomElement()?.removeEventListener("keydown", onKeydown);
  });
};
