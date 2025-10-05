import { nextTick } from "vue";
import { defineStore } from "pinia";
import { FederatedPointerEvent } from "pixi.js";

import type { WorkflowObject } from "@/api/custom-types";
import type { NodePort, PortGroup, XY } from "@/api/gateway-api/generated-api";
import type { QuickActionMenuProps } from "@/components/workflowEditor/CanvasAnchoredComponents/QuickActionMenu/QuickActionMenu.vue";
import { canvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import * as $shapes from "@/style/shapes";
import { workflowNavigationService } from "@/util/workflowNavigationService";
import { useCanvasModesStore } from "../application/canvasModes";
import { useWebGLCanvasStore } from "../canvas/canvas-webgl";
import { useCurrentCanvasStore } from "../canvas/useCurrentCanvasStore";
import { useFloatingConnectorStore } from "../floatingConnector/floatingConnector";
import { useSelectionStore } from "../selection";

export type PortTypeMenuState = {
  props: {
    position: XY;
    side: "input" | "output";
    portGroups?: Record<string, PortGroup> | null;
  };
  events: {
    itemActive?: (payload: { port?: { typeId: string } } | null) => void;
    itemClick?: (payload: { typeId: string; portGroup: string | null }) => void;
    menuClose?: () => void;
  };
};

type State = {
  /**
   * Workflow Context Menu state
   */
  contextMenu: {
    isOpen: boolean;
    position: XY | null;
    anchoredTo?: WorkflowObject;
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
    props: PortTypeMenuState["props"] | null;
    events: PortTypeMenuState["events"];
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

type PointerInteractionEvent =
  | MouseEvent
  | PointerEvent
  | FederatedPointerEvent;

const getPointerBasedPosition = (event: PointerInteractionEvent) => {
  const { screenToCanvasCoordinates, toCanvasCoordinates } =
    useCurrentCanvasStore().value;

  const [x, y] =
    event instanceof FederatedPointerEvent
      ? toCanvasCoordinates([event.global.x, event.global.y])
      : screenToCanvasCoordinates([event.clientX, event.clientY]);

  return { x, y };
};

const getKeyboardBasedPosition = async () => {
  const { getCenterOfScrollContainer } = useCurrentCanvasStore().value;

  // random offset pushing the position slightly down from the x,y coordinate
  const OFFSET = 16;
  const extractXYWithOffset = ({ x, y }: XY) => ({
    x: x + OFFSET,
    y: y + OFFSET,
  });

  // fallback position for keyboard shortcut to open context menu
  const getSelectionBasedPosition = async () => {
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
      reference: { ...getCenterOfScrollContainer("right"), id: "" },
      direction: "left",
    });

    // the nearestObject uses some max distances so it can happen that there is nothing "found"
    if (!mostRightObject) {
      return null;
    }
    return extractXYWithOffset(mostRightObject);
  };

  const selectionBasedPosition = await getSelectionBasedPosition();
  const position = selectionBasedPosition ?? getCenterOfScrollContainer();

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
        props: PortTypeMenuState["props"];
        events: PortTypeMenuState["events"];
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
        useSVGCanvasStore().focus();
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
          const floatingConnectorStore = useFloatingConnectorStore();

          // add floating connector / decorator
          if (!props.nodeId || !props.port || !props.nodeRelation) {
            floatingConnectorStore.createDecorationOnly(props.position);
          } else {
            floatingConnectorStore.createConnectorFromContext(
              props.nodeId,
              props.port,
              props.position,
              props.nodeRelation,
            );
          }

          const offsets = {
            x: $shapes.portSize / 2,
            y: $shapes.addNodeGhostSize / 2 + 2,
          };

          const isPredecessor = props.nodeRelation === "PREDECESSORS";

          canvasStore.setCanvasAnchor({
            isOpen: true,
            placement: isPredecessor ? "top-right" : "top-left",
            offset: isPredecessor ? $shapes.portSize * -1 : 0,
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
          useSVGCanvasStore().focus();
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

      hideQuickActionMenuConnector() {
        this.quickActionMenu = {
          ...this.quickActionMenu,
          hasConnector: false,
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
        anchoredTo,
      }: {
        event?: PointerInteractionEvent;
        anchoredTo?: WorkflowObject;
      } = {}) {
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

        // event is optional because in the case of keyboard interactions to open
        // the context menu, we can't derive a position from the event
        if (event) {
          // we do not want it to bubble up if we handle it here
          event.stopPropagation();
          event.preventDefault();
        }

        // reset to selection mode
        useCanvasModesStore().resetCanvasMode();

        const position = event
          ? getPointerBasedPosition(event)
          : await getKeyboardBasedPosition();

        if (canvasRendererUtils.isWebGLRenderer()) {
          useWebGLCanvasStore().setCanvasAnchor({
            isOpen: true,
            anchor: position,
          });
        }

        this.contextMenu = {
          isOpen: true,
          position,
          anchoredTo,
        };
      },

      closeContextMenu(event?: MouseEvent) {
        if (event) {
          // when closing an active menu, we could optionally receive a native event
          // e.g. the menu is getting closed by right-clicking again
          event.preventDefault();
        }

        nextTick(() => {
          useSVGCanvasStore().focus();
        });

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
        anchoredTo,
      }: {
        event?: PointerInteractionEvent;
        anchoredTo?: WorkflowObject;
      } = {}) {
        if (this.contextMenu.isOpen) {
          this.closeContextMenu(event);
        } else {
          await this.openContextMenu({ event, anchoredTo });
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
