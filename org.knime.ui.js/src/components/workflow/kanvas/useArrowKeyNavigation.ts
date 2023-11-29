import { computed, onBeforeUnmount, onMounted } from "vue";
import throttle from "raf-throttle";

import { getMetaOrCtrlKey } from "webapps-common/util/navigator";

import { useStore } from "@/composables/useStore";
import { workflowNavigationService } from "@/util/workflowNavigationService";

const isMovementEvent = (event: KeyboardEvent) => {
  const metaOrCtrlKey = getMetaOrCtrlKey();
  return event.shiftKey && event[metaOrCtrlKey];
};

const getDeltas = (event: KeyboardEvent) => {
  const movementMinDistance = 10;
  const selectionMinDistance = 200;

  const delta = isMovementEvent(event)
    ? movementMinDistance
    : selectionMinDistance;

  const deltaY = {
    ArrowUp: -delta,
    ArrowDown: delta,
  }[event.key];

  const deltaX = {
    ArrowLeft: -delta,
    ArrowRight: delta,
  }[event.key];

  return { deltaX, deltaY };
};

export const useArrowKeyNavigation = () => {
  const store = useStore();
  const activeWorkflow = computed(() => store.state.workflow.activeWorkflow);
  const isDragging = computed(() => store.state.workflow.isDragging);
  const isWritable = computed(() => store.getters["workflow/isWritable"]);
  const singleSelectedNode = computed(
    () => store.getters["selection/singleSelectedNode"],
  );

  const getScrollContainerElement = computed(
    () => store.state.canvas.getScrollContainerElement,
  );

  window.addEventListener(
    "keydown",
    function (e) {
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(
          e.code,
        ) > -1
      ) {
        e.preventDefault();
      }
    },
    false,
  );

  const handleMovement = (deltaX: number, deltaY: number) => {
    if (!isDragging.value) {
      store.commit("workflow/setIsDragging", true);
    }

    store.commit("workflow/setMovePreview", {
      deltaX: deltaX ?? 0,
      deltaY: deltaY ?? 0,
    });
    store.dispatch("workflow/moveObjects");
  };

  const handleSelection = async (
    event: KeyboardEvent,
    deltaX: number,
    deltaY: number,
  ) => {
    const isXAxis = event.key === "ArrowLeft" || event.key === "ArrowRight";
    const isYAxis = event.key === "ArrowUp" || event.key === "ArrowDown";

    if (!singleSelectedNode.value) {
      return;
    }

    const {
      id,
      position: { x: origX, y: origY },
    } = singleSelectedNode.value;

    const isOnDirectionVector = (event: KeyboardEvent, { x, y }) => {
      if (event.key === "ArrowUp") {
        return y < origY;
      }
      if (event.key === "ArrowDown") {
        return y > origY;
      }
      if (event.key === "ArrowLeft") {
        return x < origX;
      }
      if (event.key === "ArrowRight") {
        return x > origX;
      }
      return false;
    };

    const x = isXAxis ? origX + deltaX : origX;
    const y = isYAxis ? origY + deltaY : origY;

    const nearestNodes = await workflowNavigationService.nearest({
      workflow: activeWorkflow.value,
      position: { x, y },
    });

    const nearest = nearestNodes
      .filter(([node]) => node.id !== id)
      .filter(([node]) => isOnDirectionVector(event, { x: node.x, y: node.y }))
      // find the node with the smallest delta
      .reduce(
        (acc, [node, delta], index) =>
          acc.delta > delta ? { index, ...node, delta } : acc,
        {
          index: -1,
          id: null,
          delta: Infinity,
          x: null,
          y: null,
        },
      );

    if (nearest.id) {
      const kanvas = getScrollContainerElement.value();
      const halfX = kanvas.clientWidth / 2;
      const halfY = kanvas.clientHeight / 2;

      await store.dispatch("selection/deselectAllObjects");
      await store.dispatch("selection/selectNode", nearest.id);
      await store.dispatch("canvas/scroll", {
        canvasX: nearest.x - halfX,
        canvasY: nearest.y - halfY,
        smooth: true,
      });
    }
  };

  const keyboardNavHandler = throttle((event: KeyboardEvent) => {
    if (!isWritable.value) {
      return;
    }

    const { deltaX, deltaY } = getDeltas(event);

    if (
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight"
    ) {
      if (isMovementEvent(event)) {
        handleMovement(deltaX, deltaY);
      } else {
        handleSelection(event, deltaX, deltaY);
      }
    }
  });

  onMounted(() => {
    document.addEventListener("keydown", keyboardNavHandler);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("keydown", keyboardNavHandler);
  });
};
