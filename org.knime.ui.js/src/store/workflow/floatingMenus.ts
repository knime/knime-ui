import { defineStore } from "pinia";

import type { NodePort, PortGroup, XY } from "@/api/gateway-api/generated-api";
import type { QuickActionMenuProps } from "@/components/workflowEditor/CanvasAnchoredComponents/QuickActionMenu/QuickActionMenu.vue";
import { useCanvasStore } from "@/store/canvas";

type FloatingMenusState = {
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
      itemActive?: (...args: any[]) => void;
      itemClick?: (...args: any[]) => void;
      menuClose?: (...args: any[]) => void;
    };
  };

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

export const useFloatingMenusStore = defineStore("floatingMenus", {
  state: (): FloatingMenusState => ({
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
    setPortTypeMenu(portTypeMenu: FloatingMenusState["portTypeMenu"]) {
      this.portTypeMenu = portTypeMenu;
    },

    setQuickActionMenu(quickActionMenu: FloatingMenusState["quickActionMenu"]) {
      this.quickActionMenu = quickActionMenu;
    },

    setPortTypeMenuPreviewPort(
      previewPort: FloatingMenusState["portTypeMenu"]["previewPort"],
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
      props: FloatingMenusState["portTypeMenu"]["props"];
      events: FloatingMenusState["portTypeMenu"]["events"];
    }) {
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
      props: QuickActionMenuProps | null;
      events?: FloatingMenusState["quickActionMenu"]["events"];
    }) {
      this.setQuickActionMenu({
        isOpen: true,
        isLocked: false,
        hasConnector: true,
        props,
        events: events
          ? events
          : { menuClose: () => this.closeQuickActionMenu() },
      });
    },

    closeQuickActionMenu({ force = false } = {}) {
      if (this.quickActionMenu.isLocked && !force) {
        return;
      }

      this.setQuickActionMenu({
        isOpen: false,
        isLocked: false,
        hasConnector: true,
        props: null,
        events: {},
      });

      useCanvasStore().focus();
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
  },
});
