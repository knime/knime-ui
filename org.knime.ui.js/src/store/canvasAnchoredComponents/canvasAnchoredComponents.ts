import { nextTick } from "vue";
import { defineStore } from "pinia";

import type { WorkflowObject } from "@/api/custom-types";
import type { NodePort, PortGroup, XY } from "@/api/gateway-api/generated-api";
import type { QuickActionMenuProps } from "@/components/workflowEditor/CanvasAnchoredComponents/QuickActionMenu/QuickActionMenu.vue";
import { canvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import { useCanvasStore } from "@/store/canvas";
import * as $shapes from "@/style/shapes";
import { workflowNavigationService } from "@/util/workflowNavigationService";
import { useCanvasModesStore } from "../application/canvasModes";
import { useWebGLCanvasStore } from "../canvas/canvas-webgl";
import { useFloatingConnectorStore } from "../floatingConnector/floatingConnector";
import { useSelectionStore } from "../selection";

type State = {
  /**
   * Workflow Context Menu state
   */
  contextMenu: {
    isOpen: boolean;
    position: XY | null;
  };

  /**
   * Menu state for dynamic port menu
   */
  portTypeMenu: {
    isOpen: boolean;
    nodeId: string | null;
    startNodeId: string | null;
    previewPort: NodePort | { typeId: string } | null;
    // TODO: improve typing by exporting Props from PortTypeMenu component
    props: {
      position: XY;
      side: "input" | "output";
      portGroups: Record<string, PortGroup> | null;
    } | null;

    events: {
      itemActive?: (payload: { port?: { typeId: string } } | null) => void;

      itemClick?: (payload: {
        typeId: string;
        portGroup: string | null;
      }) => void;

      menuClose?: () => void;
    };
  };

  /**
   * Quick action menu state
   */
  quickActionMenu: {
    isOpen: boolean;
    isLocked: boolean;
    hasConnector: boolean;
    props: QuickActionMenuProps | null;
    events: {
      menuClose?: () => void;
    };
  };
};

const getContextMenuPositionOnSVGCanvas = async (event: MouseEvent) => {
  const eventBasedPosition = () => {
    const { clientX, clientY } = event;
    if (!clientX && !clientY) {
      return null;
    }

    const screenToCanvasCoordinates =
      useCanvasStore().screenToCanvasCoordinates;

    const [x, y] = screenToCanvasCoordinates([clientX, clientY]);

    return { x, y };
  };

  // the node offset is also fine for annotations so we use it all the time
  const extractXYWithOffset = ({ x, y }: XY) => ({
    x: x + $shapes.nodeSize / 2,
    y: y + $shapes.nodeSize / 2,
  });

  const centerOfVisibleArea = useCanvasStore().getCenterOfScrollContainer;

  // fallback position for keyboard shortcut to open context menu
  const selectionBasedPosition = async () => {
    const selectedObjects: WorkflowObject[] =
      useSelectionStore().selectedObjects;

    if (selectedObjects.length === 0) {
      return null;
    }

    // use position of object if we only have one selected
    if (selectedObjects.length === 1) {
      return extractXYWithOffset(selectedObjects[0]);
    }

    // try to find the object that is nearest going left from the right border (y-centered) of the visible area
    const mostRightObject = await workflowNavigationService.nearestObject({
      objects: selectedObjects,
      reference: {
        ...centerOfVisibleArea("right"),
        id: "",
      },
      direction: "left",
    });

    // the nearestObject uses some max distances so it can happen that there is nothing "found"
    if (!mostRightObject) {
      return null;
    }
    return extractXYWithOffset(mostRightObject);
  };

  const position =
    eventBasedPosition() ??
    (await selectionBasedPosition()) ??
    centerOfVisibleArea();

  return position;
};

export const useCanvasAnchoredComponentsStore = defineStore(
  "canvasAnchoredComponents",
  {
    state: (): State => ({
      contextMenu: {
        isOpen: false,
        position: null,
      },

      portTypeMenu: {
        isOpen: false,
        nodeId: null,
        startNodeId: null,
        previewPort: null,
        props: null,
        events: {},
      },

      quickActionMenu: {
        isOpen: false,
        isLocked: false,
        hasConnector: true,
        props: null,
        events: {},
      },
    }),
    actions: {
      setPortTypeMenu(portTypeMenu: State["portTypeMenu"]) {
        this.portTypeMenu = portTypeMenu;
      },

      setQuickActionMenu(quickActionMenu: State["quickActionMenu"]) {
        this.quickActionMenu = quickActionMenu;
      },

      setPortTypeMenuPreviewPort(
        previewPort: State["portTypeMenu"]["previewPort"],
      ) {
        this.portTypeMenu = { ...this.portTypeMenu, previewPort };
      },

      openPortTypeMenu({
        nodeId,
        startNodeId,
        props,
        events,
      }: {
        nodeId: string | null;
        startNodeId?: string | null;
        props: State["portTypeMenu"]["props"];
        events: State["portTypeMenu"]["events"];
      }) {
        if (canvasRendererUtils.isWebGLRenderer()) {
          const canvasStore = useWebGLCanvasStore();
          const placement = props!.side === "input" ? "top-right" : "top-left";
          canvasStore.setCanvasAnchor({
            isOpen: true,
            anchor: props!.position,
            placement,
          });
        }

        this.setPortTypeMenu({
          isOpen: true,
          previewPort: null,
          nodeId,
          startNodeId: startNodeId ?? null,
          props,
          events,
        });
      },

      closePortTypeMenu() {
        if (canvasRendererUtils.isWebGLRenderer()) {
          const canvasStore = useWebGLCanvasStore();

          canvasStore.clearCanvasAnchor();
        }

        this.setPortTypeMenu({
          isOpen: false,
          nodeId: null,
          startNodeId: null,
          previewPort: null,
          props: null,
          events: {},
        });
        useCanvasStore().focus();
      },

      openQuickActionMenu({
        props,
        events,
      }: {
        props: QuickActionMenuProps;
        events?: State["quickActionMenu"]["events"];
      }) {
        if (canvasRendererUtils.isWebGLRenderer()) {
          const canvasStore = useWebGLCanvasStore();

          const offsets = {
            x: $shapes.portSize / 2,
            y: $shapes.addNodeGhostSize / 2 + 2,
          };

          canvasStore.setCanvasAnchor({
            isOpen: true,
            anchor: {
              x: props.position.x + offsets.x,
              y: props.position.y + offsets.y,
            },
          });
        }

        this.setQuickActionMenu({
          isOpen: true,
          isLocked: false,
          hasConnector: true,
          props,
          events: events ?? { menuClose: () => this.closeQuickActionMenu() },
        });
      },

      closeQuickActionMenu({ force = false } = {}) {
        if (this.quickActionMenu.isLocked && !force) {
          return;
        }

        if (canvasRendererUtils.isWebGLRenderer()) {
          const canvasStore = useWebGLCanvasStore();

          canvasStore.clearCanvasAnchor();
        }

        this.setQuickActionMenu({
          isOpen: false,
          isLocked: false,
          hasConnector: true,
          props: null,
          events: {},
        });

        const floatingConnectorStore = useFloatingConnectorStore();
        if (floatingConnectorStore.floatingConnector) {
          floatingConnectorStore.removeActiveConnector();
        }

        // Wait for quick action menu to unmount, it's auto-focus would take over otherwise
        nextTick(() => {
          useCanvasStore().focus();
        });
      },

      lockQuickActionMenu() {
        this.quickActionMenu = {
          ...this.quickActionMenu,
          isLocked: true,
        };
      },

      unlockQuickActionMenu() {
        this.quickActionMenu = {
          ...this.quickActionMenu,
          isLocked: false,
        };
      },

      enableDetachedMode() {
        const DETACHED_MODE_OFFSET = 125;

        this.quickActionMenu = {
          ...this.quickActionMenu,
          hasConnector: false,
          props: {
            ...this.quickActionMenu.props,
            position: {
              x: this.quickActionMenu.props!.position.x,
              y: this.quickActionMenu.props!.position.y - DETACHED_MODE_OFFSET,
            },
          },
        };
      },

      async openContextMenu({
        event,
        deselectAllObjects = false,
      }: {
        event?: MouseEvent;
        deselectAllObjects?: boolean;
      }) {
        if (this.contextMenu.isOpen) {
          return;
        }

        // close other menus if they are open
        if (this.quickActionMenu.isOpen) {
          this.quickActionMenu.events.menuClose?.();
        }

        if (this.portTypeMenu.isOpen) {
          this.portTypeMenu.events.menuClose?.();
        }

        // event is optional because it's not required fot the WebGL canvas
        if (event) {
          // we do not want it to bubble up if we handle it here
          event.stopPropagation();
          event.preventDefault();
        }

        if (deselectAllObjects) {
          useSelectionStore().deselectAllObjects();
        }

        // reset to selection mode
        useCanvasModesStore().resetCanvasMode();

        if (canvasRendererUtils.isWebGLRenderer()) {
          this.contextMenu = {
            isOpen: true,
            position: useWebGLCanvasStore().canvasAnchor.anchor,
          };

          return;
        }

        // event is required for the SVG canvas
        if (!event) {
          return;
        }

        const position = await getContextMenuPositionOnSVGCanvas(event);

        this.contextMenu = {
          isOpen: true,
          position,
        };
      },

      closeContextMenu(event?: MouseEvent) {
        if (event) {
          // when closing an active menu, we could optionally receive a native event
          // e.g. the menu is getting closed by right-clicking again
          event.preventDefault();
          useCanvasStore().focus();
        }

        if (canvasRendererUtils.isWebGLRenderer()) {
          useWebGLCanvasStore().clearCanvasAnchor();
        }

        this.contextMenu = {
          isOpen: false,
          position: null,
        };
      },

      async toggleContextMenu({
        event,
        deselectAllObjects = false,
      }: {
        event?: MouseEvent;
        deselectAllObjects?: boolean;
      } = {}) {
        if (this.contextMenu.isOpen) {
          this.closeContextMenu(event);
        } else {
          await this.openContextMenu({ event, deselectAllObjects });
        }
      },

      closeAllAnchoredMenus() {
        this.closeContextMenu();
        this.closePortTypeMenu();
        this.closeQuickActionMenu();
      },
    },
  },
);
