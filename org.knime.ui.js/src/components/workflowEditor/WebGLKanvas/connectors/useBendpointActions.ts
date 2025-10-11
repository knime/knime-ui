import { type Ref, computed, nextTick, ref } from "vue";
import { storeToRefs } from "pinia";
import type { FederatedPointerEvent } from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useConnectionInteractionsStore } from "@/store/workflow/connectionInteractions";
import { useMovingStore } from "@/store/workflow/moving";
import { getBendpointId } from "@/util/connectorUtil";
import { isMultiselectEvent } from "../../util/isMultiselectEvent";
import { useObjectInteractions } from "../common/useObjectInteractions";
import { markPointerEventAsHandled } from "../util/interaction";

type UseBendpointActionsOptions = {
  connectionId: string;
  isConnectionHighlighted: Ref<boolean>;
  isConnectionHovered: Ref<boolean>;
};

export const useBendpointActions = (options: UseBendpointActionsOptions) => {
  const { connectionId, isConnectionHighlighted, isConnectionHovered } =
    options;

  const {
    isConnectionSelected,
    isBendpointSelected,
    selectBendpoints,
    tryClearSelection,
  } = useSelectionStore();

  const virtualBendpoint = ref<{ index: number; position: XY } | null>(null);
  const { addVirtualBendpoint, addBendpoint } =
    useConnectionInteractionsStore();

  const canvasStore = useWebGLCanvasStore();
  const { toCanvasCoordinates } = storeToRefs(canvasStore);
  const { isDragging } = storeToRefs(useMovingStore());
  const canvasAnchoredComponentsStore = useCanvasAnchoredComponentsStore();

  const hoveredBendpoint = ref<number | null>(null);

  const isBendpointVisible = computed(() => {
    return (
      isConnectionSelected(connectionId) ||
      isConnectionHighlighted.value ||
      isConnectionHovered.value
    );
  });

  const onBendpointMoveEnd = () => {
    if (virtualBendpoint.value) {
      addBendpoint({ ...virtualBendpoint.value, connectionId });
      virtualBendpoint.value = null;

      return Promise.resolve({ shouldMove: false });
    }

    return Promise.resolve({ shouldMove: true });
  };

  const onBendpointSelect = () => {
    if (virtualBendpoint.value) {
      addBendpoint({ ...virtualBendpoint.value, connectionId });
      virtualBendpoint.value = null;
    }
  };

  const onBendpointClick = (event: FederatedPointerEvent, index: number) => {
    const bendpointId = getBendpointId(connectionId, index - 1);

    const { handlePointerInteraction } = useObjectInteractions({
      objectMetadata: { type: "bendpoint", bendpointId },
      onMoveEnd: onBendpointMoveEnd,
      onSelect: onBendpointSelect,
    });

    handlePointerInteraction(event);
  };

  const setHoveredBendpoint = (isHovered: boolean, index: number) => {
    if (isDragging.value) {
      return;
    }
    hoveredBendpoint.value = isHovered ? index : null;
  };

  const onBendpointRightClick = async (
    event: FederatedPointerEvent,
    index: number,
  ) => {
    markPointerEventAsHandled(event, { initiator: "bendpoint::onContextMenu" });
    const bendpointId = getBendpointId(connectionId, index);
    hoveredBendpoint.value = index;
    // clone point so that coordinates are preserved after async call
    const globalPointClone = event.global.clone();

    if (!isBendpointSelected(bendpointId)) {
      const { wasAborted } = await tryClearSelection();

      if (wasAborted) {
        return;
      }
    }

    selectBendpoints(bendpointId);
    event.global.set(globalPointClone.x, globalPointClone.y);
    canvasAnchoredComponentsStore.toggleContextMenu({ event });
  };

  const onVirtualBendpointClick = ({
    position,
    index,
    event,
  }: {
    position: XY;
    index: number;
    event: FederatedPointerEvent;
  }) => {
    if (isMultiselectEvent(event)) {
      return;
    }

    addVirtualBendpoint({
      position,
      connectionId,
      index,
    });

    const [x, y] = toCanvasCoordinates.value([event.globalX, event.globalY]);

    virtualBendpoint.value = {
      index,
      position: { x, y },
    };

    // after virtual bendpoints are added to the store they will be rendered
    // as if they were real bendpoints. But since the original pointer event
    // happened on a different element we now redispatch it to the correct
    // element so that the normal click&drag logic can happen
    event.stopPropagation();
    nextTick(() => {
      onBendpointClick(event, index + 1);
    });
  };

  return {
    hoveredBendpoint,
    isBendpointVisible,
    setHoveredBendpoint,
    onBendpointClick,
    onBendpointRightClick,
    onVirtualBendpointClick,
  };
};
