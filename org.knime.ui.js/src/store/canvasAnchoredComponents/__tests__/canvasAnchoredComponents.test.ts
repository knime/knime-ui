import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { canvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import type { useWorkflowStore } from "@/store/workflow/workflow";
import { nodeSize, portSize } from "@/style/shapes";
import {
  createNativeNode,
  createPort,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockedObject } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { workflowNavigationService } from "@/util/workflow-canvas";

vi.mock("@/util/workflow-canvas", async () => {
  return {
    ...(await vi.importActual("@/util/workflow-canvas")),
    workflowNavigationService: {
      nearestObject: vi.fn(),
    },
  };
});

describe("canvasAnchoredComponents", () => {
  describe("quickActionMenu", () => {
    it("opens the quick add node menu", () => {
      const { canvasAnchoredComponentsStore } = mockStores();

      expect(canvasAnchoredComponentsStore.quickActionMenu.isOpen).toBe(false);

      canvasAnchoredComponentsStore.openQuickActionMenu({
        props: { position: { x: 0, y: 0 } },
        events: { menuClose: () => {} },
      });

      expect(canvasAnchoredComponentsStore.quickActionMenu.isOpen).toBe(true);
      expect(canvasAnchoredComponentsStore.quickActionMenu.props).toStrictEqual(
        {
          position: { x: 0, y: 0 },
        },
      );
      expect(
        canvasAnchoredComponentsStore.quickActionMenu.events,
      ).toMatchObject({
        menuClose: expect.anything(),
      });
    });

    describe("on WebGCanvas", () => {
      beforeAll(() => {
        canvasRendererUtils.toggleCanvasRenderer();
      });

      afterAll(() => {
        canvasRendererUtils.toggleCanvasRenderer();
      });

      it("initializes the canvas anchor", () => {
        const { canvasAnchoredComponentsStore, webglCanvasStore } =
          mockStores();

        expect(canvasAnchoredComponentsStore.quickActionMenu.isOpen).toBe(
          false,
        );

        canvasAnchoredComponentsStore.openQuickActionMenu({
          props: { position: { x: 10, y: 20 }, nodeRelation: "PREDECESSORS" },
          events: { menuClose: () => {} },
        });

        expect(webglCanvasStore.setCanvasAnchor).toHaveBeenCalledWith({
          isOpen: true,
          placement: "top-right",
          offset: portSize * -1,
          anchor: {
            x: 14.5,
            y: 32,
          },
        });
      });

      it("initializes the floating connector", () => {
        const { canvasAnchoredComponentsStore, floatingConnectorStore } =
          mockStores();

        expect(canvasAnchoredComponentsStore.quickActionMenu.isOpen).toBe(
          false,
        );

        const port = createPort();
        canvasAnchoredComponentsStore.openQuickActionMenu({
          props: {
            position: { x: 10, y: 20 },
            nodeRelation: "PREDECESSORS",
            nodeId: "root:1",
            port,
          },
          events: { menuClose: () => {} },
        });

        expect(
          floatingConnectorStore.createDecorationOnly,
        ).not.toHaveBeenCalled();
        expect(
          floatingConnectorStore.createConnectorFromContext,
        ).toHaveBeenCalledWith(
          "root:1",
          port,
          { x: 10, y: 20 },
          "PREDECESSORS",
        );
      });

      it("initializes the floating connector decorator only", () => {
        const { canvasAnchoredComponentsStore, floatingConnectorStore } =
          mockStores();

        expect(canvasAnchoredComponentsStore.quickActionMenu.isOpen).toBe(
          false,
        );

        canvasAnchoredComponentsStore.openQuickActionMenu({
          props: {
            position: { x: 10, y: 20 },
          },
          events: { menuClose: () => {} },
        });

        expect(
          floatingConnectorStore.createDecorationOnly,
        ).toHaveBeenCalledWith({ x: 10, y: 20 });
        expect(
          floatingConnectorStore.createConnectorFromContext,
        ).not.toHaveBeenCalled();
      });
    });

    it("closes the quick add node menu", () => {
      const { canvasAnchoredComponentsStore } = mockStores();

      // @ts-expect-error
      canvasAnchoredComponentsStore.openQuickActionMenu({});
      expect(canvasAnchoredComponentsStore.quickActionMenu.isOpen).toBe(true);

      canvasAnchoredComponentsStore.closeQuickActionMenu();
      expect(canvasAnchoredComponentsStore.quickActionMenu.isOpen).toBe(false);
    });
  });

  describe("portTypeMenu", () => {
    it("sets the preview of a portTypeMenu", () => {
      const { canvasAnchoredComponentsStore } = mockStores();
      canvasAnchoredComponentsStore.setPortTypeMenuPreviewPort({
        typeId: "prev",
      });

      expect(
        canvasAnchoredComponentsStore.portTypeMenu.previewPort,
      ).toStrictEqual({
        typeId: "prev",
      });
    });

    it("opens the port type menu", () => {
      const { canvasAnchoredComponentsStore } = mockStores();

      expect(canvasAnchoredComponentsStore.portTypeMenu.isOpen).toBe(false);

      canvasAnchoredComponentsStore.openPortTypeMenu({
        nodeId: "node-id",
        props: { side: "output", position: { x: 0, y: 0 }, portGroups: null },
        startNodeId: "start-node-id",
        events: { menuClose: () => {} },
      });

      expect(canvasAnchoredComponentsStore.portTypeMenu.isOpen).toBe(true);
      expect(canvasAnchoredComponentsStore.portTypeMenu.nodeId).toBe("node-id");
      expect(canvasAnchoredComponentsStore.portTypeMenu.startNodeId).toBe(
        "start-node-id",
      );
      expect(canvasAnchoredComponentsStore.portTypeMenu.previewPort).toBeNull();
      expect(canvasAnchoredComponentsStore.portTypeMenu.props).toStrictEqual({
        side: "output",
        position: { x: 0, y: 0 },
        portGroups: null,
      });
      expect(canvasAnchoredComponentsStore.portTypeMenu.events).toMatchObject({
        menuClose: expect.anything(),
      });
    });

    it("closes the port type menu", () => {
      const { canvasAnchoredComponentsStore } = mockStores();

      // @ts-expect-error
      canvasAnchoredComponentsStore.openPortTypeMenu({});
      expect(canvasAnchoredComponentsStore.portTypeMenu.isOpen).toBe(true);

      canvasAnchoredComponentsStore.closePortTypeMenu();
      expect(canvasAnchoredComponentsStore.portTypeMenu.isOpen).toBe(false);
    });
  });

  describe("context Menu", () => {
    const mockStoresWith = () => {
      const mockedStores = mockStores();

      // @ts-expect-error
      mockedStores.canvasStore.screenToCanvasCoordinates = ([x, y]) => [x, y];

      return mockedStores;
    };

    const createEvent = ({ x = 0, y = 0 } = {}) => {
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      const eventMock = {
        clientX: x,
        clientY: y,
        preventDefault,
        stopPropagation,
      };

      return { event: eventMock, preventDefault, stopPropagation };
    };

    it("should set the context menu", async () => {
      const { event, preventDefault, stopPropagation } = createEvent({
        x: 200,
        y: 200,
      });
      const { selectionStore, canvasAnchoredComponentsStore } =
        mockStoresWith();

      // @ts-expect-error
      await canvasAnchoredComponentsStore.toggleContextMenu({ event });
      expect(selectionStore.deselectAllObjects).not.toHaveBeenCalled();
      expect(canvasAnchoredComponentsStore.contextMenu.isOpen).toBe(true);
      expect(canvasAnchoredComponentsStore.contextMenu.position).toEqual({
        x: 200,
        y: 200,
      });
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    const createAndSetWorkflow = (
      store: ReturnType<typeof useWorkflowStore>,
    ) => {
      const node1 = createNativeNode({
        id: "root:1",
        position: { x: 25, y: 25 },
      });
      const node2 = createNativeNode({
        id: "root:2",
        position: { x: 20, y: 10 },
      });
      const annotation1 = createWorkflowAnnotation({
        id: "annotation:1",
        bounds: { x: 40, y: 10, width: 20, height: 20 },
      });
      const workflow = createWorkflow({
        nodes: {
          [node1.id]: node1,
          [node2.id]: node2,
        },
        workflowAnnotations: [annotation1],
      });
      store.setActiveWorkflow(workflow);
      return { node1, node2, annotation1, workflow };
    };

    it("should use the selected nodes as position if event has none (e.g. KeyboardEvent)", async () => {
      const { selectionStore, workflowStore, canvasAnchoredComponentsStore } =
        mockStoresWith();

      const { node1, node2 } = createAndSetWorkflow(workflowStore);
      await selectionStore.selectNodes([node1.id, node2.id]);

      const mocked = mockedObject(workflowNavigationService);
      mocked.nearestObject.mockResolvedValueOnce({
        type: "node",
        id: node2.id,
        ...node2.position,
      });

      await canvasAnchoredComponentsStore.toggleContextMenu();
      expect(selectionStore.deselectAllObjects).not.toHaveBeenCalled();
      expect(canvasAnchoredComponentsStore.contextMenu.isOpen).toBe(true);
      expect(canvasAnchoredComponentsStore.contextMenu.position).toEqual({
        x: 36,
        y: 26,
      });
    });

    it("should use the single (!) selected node as position if event has none (e.g. KeyboardEvent)", async () => {
      const { selectionStore, workflowStore, canvasAnchoredComponentsStore } =
        mockStoresWith();

      const { node1 } = createAndSetWorkflow(workflowStore);
      await selectionStore.selectNodes([node1.id]);

      await canvasAnchoredComponentsStore.toggleContextMenu();
      expect(selectionStore.deselectAllObjects).not.toHaveBeenCalled();
      expect(canvasAnchoredComponentsStore.contextMenu.isOpen).toBe(true);
      // offset of a half node size
      const x = node1.position.x + nodeSize / 2;
      const y = node1.position.y + nodeSize / 2;
      expect(canvasAnchoredComponentsStore.contextMenu.position).toEqual({
        x,
        y,
      });
    });

    it("should use center as fallback if event has no position and no nodes are selected", async () => {
      const { selectionStore, canvasStore, canvasAnchoredComponentsStore } =
        mockStoresWith();

      // @ts-expect-error
      canvasStore.getCenterOfScrollContainer = () => ({ x: 10, y: 10 });

      await canvasAnchoredComponentsStore.toggleContextMenu();
      expect(selectionStore.deselectAllObjects).not.toHaveBeenCalled();
      expect(canvasAnchoredComponentsStore.contextMenu.isOpen).toBe(true);
      expect(canvasAnchoredComponentsStore.contextMenu.position).toEqual({
        x: 10,
        y: 10,
      });
    });

    it("should hide the menu", async () => {
      const { canvasAnchoredComponentsStore } = mockStoresWith();
      canvasAnchoredComponentsStore.contextMenu = {
        isOpen: true,
        position: { x: 200, y: 200 },
      };
      const { event, preventDefault } = createEvent();

      // @ts-expect-error
      await canvasAnchoredComponentsStore.toggleContextMenu({ event });

      expect(canvasAnchoredComponentsStore.contextMenu.isOpen).toBe(false);
      expect(canvasAnchoredComponentsStore.contextMenu.position).toBeNull();
      expect(preventDefault).toHaveBeenCalled();
    });

    it.each([
      ["PortTypeMenu", "portTypeMenu"] as const,
      ["QuickAddNodeMenu", "quickActionMenu"] as const,
    ])(
      "closes the %s if its open when context menu opens",
      async (_, stateMenuKey) => {
        const { canvasAnchoredComponentsStore } = mockStoresWith();
        const menuCloseMock = vi.fn();
        // @ts-expect-error
        canvasAnchoredComponentsStore[stateMenuKey] = {
          isOpen: true,
          events: {
            menuClose: menuCloseMock,
          },
        };
        const { event } = createEvent();

        // @ts-expect-error
        await canvasAnchoredComponentsStore.toggleContextMenu({ event });
        expect(canvasAnchoredComponentsStore.contextMenu.isOpen).toBe(true);
        expect(menuCloseMock).toHaveBeenCalled();
      },
    );
  });
});
