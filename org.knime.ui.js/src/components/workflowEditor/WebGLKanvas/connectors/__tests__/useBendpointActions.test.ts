import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import type { FederatedPointerEvent } from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import { markPointerEventAsHandled } from "@/components/workflowEditor/WebGLKanvas/util/interaction";
import { isMultiselectEvent } from "@/components/workflowEditor/util/isMultiselectEvent";
import { createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { useBendpointActions } from "../useBendpointActions";

const useObjectInteractionsMock = vi.hoisted(() =>
  vi.fn(() => ({ handlePointerInteraction: vi.fn() })),
);
vi.mock("@/components/workflowEditor/util/isMultiselectEvent");
vi.mock("@/components/workflowEditor/WebGLKanvas/util/interaction");
vi.mock(
  "@/components/workflowEditor/WebGLKanvas/common/useObjectInteractions",
  () => ({ useObjectInteractions: useObjectInteractionsMock }),
);

const createMockEvent = (): FederatedPointerEvent => ({
  button: 0,
  clientX: 100,
  clientY: 200,
  globalX: 150,
  globalY: 250,
  // @ts-expect-error
  global: { x: 150, y: 250 },
  stopPropagation: vi.fn(),
  nativeEvent: new PointerEvent("pointerdown"),
});

const mockConnectionId = "root:2_0";

describe("useBendpointActions", () => {
  afterEach(vi.clearAllMocks);

  type MountOpts = {
    connectionId?: string;
    isConnectionHighlighted?: boolean;
    isConnectionHovered?: boolean;
    isDragging?: boolean;
  };

  const doMount = (options: MountOpts = {}) => {
    const {
      connectionId = mockConnectionId,
      isConnectionHighlighted = false,
      isConnectionHovered = false,
      isDragging = false,
    } = options;

    const mockedStores = mockStores();
    const workflow = createWorkflow({});
    mockedStores.workflowStore.setActiveWorkflow(workflow);

    mockedStores.movingStore.isDragging = isDragging;

    const result = mountComposable({
      composable: useBendpointActions,
      composableProps: {
        connectionId,
        isConnectionHighlighted: ref(isConnectionHighlighted),
        isConnectionHovered: ref(isConnectionHovered),
      },
      mockedStores,
    });

    return { ...result, mockedStores };
  };

  describe("isBendpointVisible", () => {
    it("should be true when connection is selected", () => {
      const { getComposableResult, mockedStores } = doMount();
      mockedStores.selectionStore.selectConnections(mockConnectionId);
      const { isBendpointVisible } = getComposableResult();

      expect(isBendpointVisible.value).toBe(true);
    });

    it("should be true when connection is highlighted", () => {
      const { getComposableResult } = doMount({
        isConnectionHighlighted: true,
      });
      const { isBendpointVisible } = getComposableResult();

      expect(isBendpointVisible.value).toBe(true);
    });

    it("should be true when connection is hovered", () => {
      const { getComposableResult } = doMount({ isConnectionHovered: true });
      const { isBendpointVisible } = getComposableResult();

      expect(isBendpointVisible.value).toBe(true);
    });

    it("should be false when connection is not selected, highlighted, or hovered", () => {
      const { getComposableResult } = doMount();
      const { isBendpointVisible } = getComposableResult();

      expect(isBendpointVisible.value).toBe(false);
    });
  });

  describe("setHoveredBendpoint", () => {
    it("should update hoveredBendpoint property when setHoveredBendpoint is called", () => {
      const { getComposableResult } = doMount({ isDragging: false });
      const { setHoveredBendpoint, hoveredBendpoint } = getComposableResult();

      setHoveredBendpoint(true, 1);
      expect(hoveredBendpoint.value).toBe(1);

      setHoveredBendpoint(false, 1);
      expect(hoveredBendpoint.value).toBeNull();
    });

    it("should not set hovered bendpoint when dragging", () => {
      const { getComposableResult } = doMount({ isDragging: true });
      const { setHoveredBendpoint, hoveredBendpoint } = getComposableResult();

      setHoveredBendpoint(true, 1);

      expect(hoveredBendpoint.value).toBeNull();
    });
  });

  describe("onBendpointClick", () => {
    it("should call useObjectInteractions with correct metadata", () => {
      const { getComposableResult } = doMount();
      const { onBendpointClick } = getComposableResult();

      const event = createMockEvent();
      onBendpointClick(event, 1);

      expect(useObjectInteractionsMock).toHaveBeenCalledWith({
        objectMetadata: {
          type: "bendpoint",
          bendpointId: `${mockConnectionId}__0`,
        },
        onMoveEnd: expect.any(Function),
        onSelect: expect.any(Function),
      });
    });

    describe("onBendpointMoveEnd", () => {
      it("should add bendpoint and return shouldMove: false when virtual bendpoint exists", async () => {
        vi.clearAllMocks();
        const { getComposableResult, mockedStores } = doMount();
        const { onBendpointClick, onVirtualBendpointClick } =
          getComposableResult();

        const event = createMockEvent();
        const position: XY = { x: 100, y: 200 };
        const index = 1;
        vi.mocked(isMultiselectEvent).mockReturnValue(false);

        onVirtualBendpointClick({ position, index, event });

        const event2 = createMockEvent();
        onBendpointClick(event2, index + 1);

        // @ts-expect-error
        const { onMoveEnd } = useObjectInteractionsMock.mock.calls[0][0];
        const result = await onMoveEnd();

        expect(
          mockedStores.connectionInteractionsStore.addBendpoint,
        ).toHaveBeenCalledWith({
          index,
          position: { x: 150, y: 250 },
          connectionId: mockConnectionId,
        });
        expect(result).toEqual({ shouldMove: false });
      });

      it("should return shouldMove: true when no virtual bendpoint exists", async () => {
        vi.clearAllMocks();
        const { getComposableResult } = doMount();
        const { onBendpointClick } = getComposableResult();

        const event = createMockEvent();
        onBendpointClick(event, 1);

        // @ts-expect-error
        const { onMoveEnd } = useObjectInteractionsMock.mock.calls[0][0];
        const result = await onMoveEnd();

        expect(result).toEqual({ shouldMove: true });
      });
    });

    describe("onBendpointSelect", () => {
      it("should add bendpoint when virtual bendpoint exists", () => {
        vi.clearAllMocks();
        const { getComposableResult, mockedStores } = doMount();
        const { onBendpointClick, onVirtualBendpointClick } =
          getComposableResult();

        const event = createMockEvent();
        const position: XY = { x: 100, y: 200 };
        const index = 1;
        vi.mocked(isMultiselectEvent).mockReturnValue(false);

        onVirtualBendpointClick({ position, index, event });

        const event2 = createMockEvent();
        onBendpointClick(event2, index + 1);

        // @ts-expect-error
        const { onSelect } = useObjectInteractionsMock.mock.calls[0][0];
        onSelect();

        expect(
          mockedStores.connectionInteractionsStore.addBendpoint,
        ).toHaveBeenCalledWith({
          index,
          position: { x: 150, y: 250 },
          connectionId: mockConnectionId,
        });
      });

      it("should not add bendpoint when no virtual bendpoint exists", () => {
        vi.clearAllMocks();
        const { getComposableResult, mockedStores } = doMount();
        const { onBendpointClick } = getComposableResult();

        const event = createMockEvent();
        onBendpointClick(event, 1);

        // @ts-expect-error
        const { onSelect } = useObjectInteractionsMock.mock.calls[0][0];
        onSelect();

        expect(
          mockedStores.connectionInteractionsStore.addBendpoint,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe("onBendpointRightClick", () => {
    it("should handle right click events correctly", async () => {
      const { getComposableResult, mockedStores } = doMount();
      const { onBendpointRightClick, hoveredBendpoint } = getComposableResult();

      const event = createMockEvent();
      const index = 2;

      onBendpointRightClick(event, index);

      expect(markPointerEventAsHandled).toHaveBeenCalledWith(event, {
        initiator: "bendpoint::onContextMenu",
      });

      await flushPromises();
      expect(hoveredBendpoint.value).toBe(index);
      expect(mockedStores.selectionStore.selectBendpoints).toHaveBeenCalledWith(
        `${mockConnectionId}__${index}`,
      );

      expect(
        mockedStores.canvasAnchoredComponentsStore.toggleContextMenu,
      ).toHaveBeenCalledWith({ event });
    });
  });

  describe("onVirtualBendpointClick", () => {
    it("should return early for multiselect events", () => {
      const { getComposableResult } = doMount();
      const { onVirtualBendpointClick } = getComposableResult();

      const event = createMockEvent();
      vi.mocked(isMultiselectEvent).mockReturnValue(true);

      onVirtualBendpointClick({
        position: { x: 100, y: 200 },
        index: 0,
        event,
      });

      expect(isMultiselectEvent).toHaveBeenCalledWith(event);
    });

    it("should add virtual bendpoint for normal events", () => {
      const { getComposableResult, mockedStores } = doMount();
      const { onVirtualBendpointClick } = getComposableResult();

      const event = createMockEvent();
      const position: XY = { x: 100, y: 200 };
      const index = 1;

      vi.mocked(isMultiselectEvent).mockReturnValue(false);

      onVirtualBendpointClick({ position, index, event });

      expect(event.stopPropagation).toHaveBeenCalledOnce();
      expect(
        mockedStores.connectionInteractionsStore.addVirtualBendpoint,
      ).toHaveBeenCalledWith({
        position,
        connectionId: mockConnectionId,
        index,
      });
    });
  });
});
