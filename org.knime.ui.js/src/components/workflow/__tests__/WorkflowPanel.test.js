import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import ContextMenu from "@/components/application/ContextMenu.vue";
import RightPanel from "@/components/uiExtensions/nodeConfig/NodeConfig.vue";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas.vue";
import QuickActionMenu from "@/components/workflow/quickActionMenu/QuickActionMenu.vue";
import PortTypeMenu from "@/components/workflow/ports/NodePorts/PortTypeMenu.vue";
import { createShortcutsService } from "@/plugins/shortcuts";
import * as applicationStore from "@/store/application";
import * as selectionStore from "@/store/selection";
import * as settingsStore from "@/store/settings";
import * as uiControlsStore from "@/store/uiControls";
import * as workflowStore from "@/store/workflow";
import { createWorkflow } from "@/test/factories";
import { mockVuexStore } from "@/test/utils/mockVuexStore";
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

    const storeConfig = {
      workflow: workflowStore,
      application: applicationStore,
      uiControls: uiControlsStore,
      canvas: {
        state: {
          getScrollContainerElement: () => document.createElement("div"),
        },
        getters: {
          screenToCanvasCoordinates: () => (position) => position,
        },
      },
      selection: selectionStore,
      settings: settingsStore,
    };

    const $store = mockVuexStore(storeConfig);

    $store.commit(
      "workflow/setActiveWorkflow",
      createWorkflow({
        ...baseWorkflow,
        ...workflow,
      }),
    );

    const dispatchSpy = vi.spyOn($store, "dispatch");

    const $shortcuts = createShortcutsService({ $store });

    const wrapper = shallowMount(WorkflowPanel, {
      props,
      global: {
        plugins: [$store],
        mocks: { $shortcuts, $features: mockFeatureFlags },
      },
    });

    return { wrapper, $store, dispatchSpy };
  };

  describe("context menu", () => {
    const createEvent = (x, y) => ({
      clientX: x,
      clientY: y,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });

    it("renders context menu", async () => {
      const { wrapper, $store } = doShallowMount();

      expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);

      $store.dispatch("application/toggleContextMenu", {
        event: createEvent(242, 122),
      });
      await new Promise((r) => setTimeout(r, 0));

      expect(
        wrapper.findComponent(ContextMenu).props("position"),
      ).toStrictEqual({ x: 242, y: 122 });
    });

    it("handles @menuClose event from ContextMenu properly", async () => {
      const { wrapper, $store } = doShallowMount();

      wrapper.trigger("contextmenu", { clientX: 100, clientY: 200 });
      $store.dispatch("application/toggleContextMenu", {
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
      mountResult.$store.state.workflow.portTypeMenu = {
        isOpen: true,
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
      const { wrapper, $store } = doShallowMount();
      expect(wrapper.findComponent(PortTypeMenu).exists()).toBe(false);

      $store.state.workflow.portTypeMenu = {
        isOpen: true,
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
      let portMenu = wrapper.findComponent(PortTypeMenu);

      expect(portMenu.vm.side).toBe("input");
    });

    it("binds events", async () => {
      const { wrapper, closeCallback } = await mountAndOpenMenu();
      let portMenu = wrapper.findComponent(PortTypeMenu);
      await portMenu.vm.$emit("menuClose");
      expect(closeCallback).toHaveBeenCalled();
    });
  });

  describe("quick add node menu", () => {
    const mountAndOpenMenu = async ({ closeCallback = vi.fn() } = {}) => {
      const mountResult = doShallowMount();
      mountResult.$store.state.workflow.quickActionMenu = {
        isOpen: true,
        props: {
          direction: "in",
          position: { x: 0, y: 0 },
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
      const { wrapper, $store } = doShallowMount();
      expect(wrapper.findComponent(QuickActionMenu).exists()).toBe(false);

      $store.state.workflow.quickActionMenu = {
        isOpen: true,
        props: {
          direction: "in",
          position: { x: 0, y: 0 },
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
      let quickActionMenu = wrapper.findComponent(QuickActionMenu);
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
      let quickActionMenu = wrapper.findComponent(QuickActionMenu);
      quickActionMenu.vm.$emit("menuClose");
      expect(closeCallback).toHaveBeenCalled();
    });
  });

  it("should not display right panel when flag is set to false", () => {
    const { wrapper } = doShallowMount({
      mockFeatureFlags: {
        shouldDisplayEmbeddedDialogs: vi.fn(() => false),
      },
    });

    expect(wrapper.findComponent(WorkflowCanvas).exists()).toBe(true);
    expect(wrapper.findComponent(RightPanel).exists()).toBe(false);
  });
});
