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
import { useObjectInteractions } from "../common/useObjectInteractions";
import { markEventAsHandled } from "../util/interaction";

type UseBendpointActionsOptions = {
  connectionId: string;
  isConnectionHighlighted: Ref<boolean>;
  isConnectionHovered: Ref<boolean>;
};

export const useBendpointActions = (options: UseBendpointActionsOptions) => {
  const { connectionId, isConnectionHighlighted, isConnectionHovered } =
    options;

  const { isConnectionSelected, selectBendpoints } = useSelectionStore();

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

  const onBendpointClick = (event: FederatedPointerEvent, index: number) => {
    const bendpointId = getBendpointId(connectionId, index - 1);

    const { handlePointerInteraction } = useObjectInteractions({
      objectMetadata: { type: "bendpoint", bendpointId },
      onMoveEnd: () => {
        if (virtualBendpoint.value) {
          addBendpoint({
            connectionId,
            position: virtualBendpoint.value.position,
            index: virtualBendpoint.value.index,
          });
          virtualBendpoint.value = null;

          return Promise.resolve({ shouldMove: false });
        }

        return Promise.resolve({ shouldMove: true });
      },
    });

    handlePointerInteraction(event);
  };

  const setHoveredBendpoint = (isHovered: boolean, index: number) => {
    if (isDragging.value) {
      return;
    }
    hoveredBendpoint.value = isHovered ? index : null;
  };

  const onBendpointRightClick = (
    event: FederatedPointerEvent,
    index: number,
  ) => {
    markEventAsHandled(event, { initiator: "bendpoint-ctx-menu" });
    const bendpointId = getBendpointId(connectionId, index);
    hoveredBendpoint.value = index;
    selectBendpoints(bendpointId);

    const [x, y] = toCanvasCoordinates.value([event.global.x, event.global.y]);

    canvasStore.setCanvasAnchor({
      isOpen: true,
      anchor: { x, y },
    });

    canvasAnchoredComponentsStore.toggleContextMenu();
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
