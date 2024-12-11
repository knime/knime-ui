import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import type { Workflow } from "@/api/custom-types";
import RightPanel from "@/components/uiExtensions/nodeConfig/NodeConfig.vue";
import { createShortcutsService } from "@/plugins/shortcuts";
import { createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import ContextMenu from "../CanvasAnchoredComponents/ContextMenu/ContextMenu.vue";
import PortTypeMenu from "../CanvasAnchoredComponents/PortTypeMenu/PortTypeMenu.vue";
import QuickActionMenu from "../CanvasAnchoredComponents/QuickActionMenu/QuickActionMenu.vue";
import WorkflowCanvas from "../SVGKanvas/WorkflowCanvas.vue";
import WorkflowPanel from "../WorkflowPanel.vue";

describe("WorkflowPanel", () => {
  const doShallowMount = ({
    props = {},
    workflow = {},
    mockFeatureFlags = {
      shouldDisplayEmbeddedDialogs: () => true,
    },
  } = {}) => {
    const baseWorkflow = {
      info: {
        containerType: "project",
        containerId: "root",
        providerType: "LOCAL",
      },
      parents: [],
    };

    const mockedStores = mockStores();
    // @ts-ignore
    mockedStores.canvasStore.screenToCanvasCoordinates = (position: any) =>
      position;

    mockedStores.workflowStore.setActiveWorkflow(
      createWorkflow({
        ...baseWorkflow,
        ...(workflow as Workflow),
      }),
    );

    // @ts-expect-error
    const $shortcuts = createShortcutsService({});

    const wrapper = shallowMount(WorkflowPanel, {
      props,
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: { $shortcuts, $features: mockFeatureFlags },
      },
    });

    return { wrapper, mockedStores };
  };

  describe("context menu", () => {
    const createEvent = (x, y) => ({
      clientX: x,
      clientY: y,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });

    it("renders context menu", async () => {
      const { wrapper, mockedStores } = doShallowMount();

      expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);

      await mockedStores.applicationStore.toggleContextMenu({
        // @ts-ignore
        event: createEvent(242, 122),
      });
      await new Promise((r) => setTimeout(r, 0));

      expect(
        wrapper.findComponent(ContextMenu).props("position"),
      ).toStrictEqual({ x: 242, y: 122 });
    });

    it("handles @menuClose event from ContextMenu properly", async () => {
      const { wrapper, mockedStores } = doShallowMount();

      wrapper.trigger("contextmenu", { clientX: 100, clientY: 200 });
      mockedStores.applicationStore.toggleContextMenu({
        // @ts-ignore
        event: createEvent(100, 200),
      });
      await new Promise((r) => setTimeout(r, 0));

      wrapper.findComponent(ContextMenu).vm.$emit("menuClose");

      await nextTick();
      expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);
    });
  });

  describe("port Type menu", () => {
    const mountAndOpenMenu = async ({ closeCallback = vi.fn() } = {}) => {
      const mountResult = doShallowMount();
      mountResult.mockedStores.floatingMenusStore.portTypeMenu = {
        isOpen: true,
        // @ts-expect-error
        props: {
          side: "input",
          position: { x: 0, y: 0 },
        },
        events: { menuClose: closeCallback },
      };
      await nextTick();

      return { ...mountResult, closeCallback };
    };

    it("renders if open", async () => {
      const { wrapper, mockedStores } = doShallowMount();
      expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(false);

      mockedStores.floatingMenusStore.portTypeMenu = {
        isOpen: true,
        // @ts-expect-error
        props: {
          side: "input",
          position: { x: 0, y: 0 },
        },
        events: {},
      };

      await nextTick();
      expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(true);
    });

    it("passes props", async () => {
      const { wrapper } = await mountAndOpenMenu();
      expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(true);
      const portMenu = wrapper.findComponent(PortTypeMenu);

      expect(portMenu.vm.side).toBe("input");
    });

    it("binds events", async () => {
      const { wrapper, closeCallback } = await mountAndOpenMenu();
      const portMenu = wrapper.findComponent(PortTypeMenu);
      portMenu.vm.$emit("menuClose");
      expect(closeCallback).toHaveBeenCalled();
    });
  });

  describe("quick add node menu", () => {
    const mountAndOpenMenu = async ({ closeCallback = vi.fn() } = {}) => {
      const mountResult = doShallowMount();
      mountResult.mockedStores.floatingMenusStore.quickActionMenu = {
        isOpen: true,
        props: {
          direction: "in",
          position: { x: 0, y: 0 },
          // @ts-expect-error
          port: { index: 2 },
          nodeId: "node:0",
          nodeRelation: "SUCCESSORS",
        },
        events: { menuClose: closeCallback },
      };
      await nextTick();

      return { ...mountResult, closeCallback };
    };

    it("renders menu if open", async () => {
      const { wrapper, mockedStores } = doShallowMount();
      expect(wrapper.findComponent(QuickActionMenu).exists()).toBe(false);

      mockedStores.floatingMenusStore.quickActionMenu = {
        isOpen: true,
        props: {
          direction: "in",
          position: { x: 0, y: 0 },
          // @ts-expect-error
          port: { index: 2 },
          nodeId: "node:0",
        },
        events: {},
      };

      await nextTick();
      expect(wrapper.findComponent(QuickActionMenu).exists()).toBe(true);
    });

    it("passes props", async () => {
      const { wrapper } = await mountAndOpenMenu();
      const quickActionMenu = wrapper.findComponent(QuickActionMenu);
      expect(quickActionMenu.props()).toEqual({
        nodeId: "node:0",
        port: { index: 2 },
        position: {
          x: 0,
          y: 0,
        },
        nodeRelation: "SUCCESSORS",
        positionOrigin: "mouse",
      });
    });

    it("binds events", async () => {
      const { wrapper, closeCallback } = await mountAndOpenMenu();
      const quickActionMenu = wrapper.findComponent(QuickActionMenu);
      quickActionMenu.vm.$emit("menuClose");
      expect(closeCallback).toHaveBeenCalled();
    });
  });

  it("should not display right panel when flag is set to false", () => {
    const { wrapper } = doShallowMount({
      mockFeatureFlags: {
        // @ts-ignore
        shouldDisplayEmbeddedDialogs: vi.fn(() => false),
      },
    });

    expect(wrapper.findComponent(WorkflowCanvas).exists()).toBe(true);
    expect(wrapper.findComponent(RightPanel).exists()).toBe(false);
  });
});
