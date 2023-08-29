import { expect, describe, it, vi } from "vitest";
import * as Vue from "vue";
import { shallowMount } from "@vue/test-utils";

import { createWorkflow } from "@/test/factories";
import { mockVuexStore } from "@/test/utils/mockVuexStore";
import { createShortcutsService } from "@/plugins/shortcuts";

import Button from "webapps-common/ui/components/Button.vue";

import * as workflowStore from "@/store/workflow";
import * as selectionStore from "@/store/selection";
import * as applicationStore from "@/store/application";

import ContextMenu from "@/components/application/ContextMenu.vue";
import PortTypeMenu from "@/components/workflow/ports/PortTypeMenu.vue";
import QuickAddNodeMenu from "@/components/workflow/node/quickAdd/QuickAddNodeMenu.vue";

import WorkflowPanel from "../WorkflowPanel.vue";

describe("WorkflowPanel", () => {
  const doShallowMount = ({ props = {}, workflow = {} } = {}) => {
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
      canvas: {
        state: {
          getScrollContainerElement: () => document.createElement("div"),
        },
        getters: {
          screenToCanvasCoordinates: () => (position) => position,
        },
      },
      selection: selectionStore,
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
      global: { plugins: [$store], mocks: { $shortcuts } },
    });

    return { wrapper, $store, dispatchSpy };
  };

  describe("linked and Streaming", () => {
    it.each(["metanode", "component"])(
      "write-protects linked %s and shows warning",
      (containerType) => {
        const { wrapper } = doShallowMount({
          workflow: { info: { linked: true, containerType } },
        });
        expect(wrapper.find(".read-only").exists()).toBe(true);

        const notification = wrapper.find(".workflow-info").find("span");
        expect(notification.text()).toBe(
          `This is a linked ${containerType} and can therefore not be edited.`,
        );
        expect(notification.text()).not.toContain("inside a linked");
      },
    );

    it.each([
      ["metanode", "component"],
      ["component", "metanode"],
    ])(
      "write-protects %s inside a linked %s and shows warning",
      (containerType, insideLinkedType) => {
        const { wrapper } = doShallowMount({
          workflow: {
            parents: [{ linked: true, containerType: insideLinkedType }],
            info: { containerType },
          },
        });

        expect(wrapper.find(".read-only").exists()).toBe(true);

        const notification = wrapper.find(".workflow-info").find("span");
        expect(notification.text()).toBe(
          `This is a ${containerType} inside a linked ${insideLinkedType} and cannot be edited.`,
        );
        expect(notification.text()).not.toContain(
          `This is a linked ${containerType}`,
        );
      },
    );

    it("shows decorator in streaming component", () => {
      const { wrapper } = doShallowMount({
        workflow: { info: { jobManager: "test" } },
      });
      expect(wrapper.find(".streaming-indicator").exists()).toBe(true);
    });

    it("is not linked", () => {
      const { wrapper } = doShallowMount();
      expect(wrapper.find(".read-only").exists()).toBe(false);
      expect(wrapper.find(".workflow-info").exists()).toBe(false);
    });
  });

  describe("focus", () => {
    it("should signal to the store when the component element gets focused in/out", async () => {
      const { wrapper, $store } = doShallowMount();
      expect($store.state.workflow.isWorkflowPanelFocused).toBe(false);
      await wrapper.trigger("focusin");
      expect($store.state.workflow.isWorkflowPanelFocused).toBe(true);

      await wrapper.trigger("focusout");
      expect($store.state.workflow.isWorkflowPanelFocused).toBe(false);
    });

    it("should set focus to false on unmount", async () => {
      const { wrapper, $store } = doShallowMount();
      await wrapper.trigger("focusin");

      wrapper.unmount();

      expect($store.state.workflow.isWorkflowPanelFocused).toBe(false);
    });
  });

  describe("remote workflow", () => {
    it("should not show banner if workflow is local", () => {
      const { wrapper } = doShallowMount({
        workflow: { info: { providerType: "LOCAL" } },
      });
      expect(wrapper.find(".banner").exists()).toBe(false);
    });

    it("shows banner if workflow is on the hub", () => {
      const { wrapper } = doShallowMount({
        workflow: { info: { providerType: "HUB" } },
      });
      expect(wrapper.find(".banner").exists()).toBe(true);
    });

    it("shows banner if workflow is on server", () => {
      const { wrapper } = doShallowMount({
        workflow: { info: { providerType: "SERVER" } },
      });
      expect(wrapper.find(".banner").exists()).toBe(true);
    });

    it("saves workflow locally when button is clicked", async () => {
      const { wrapper, dispatchSpy } = doShallowMount({
        workflow: { info: { providerType: "HUB" } },
      });
      await Vue.nextTick();
      const button = wrapper.findComponent(Button);
      expect(button.exists()).toBe(true);
      await button.vm.$emit("click");

      expect(dispatchSpy).toHaveBeenCalledWith("workflow/saveWorkflowAs");
    });
  });

  describe("context menu", () => {
    const createEvent = (x, y) => ({
      clientX: x,
      clientY: y,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });

    it("renders context menu", async () => {
      const { wrapper } = doShallowMount();

      expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);

      wrapper.vm.$store.dispatch("application/toggleContextMenu", {
        event: createEvent(242, 122),
      });
      await new Promise((r) => setTimeout(r, 0));

      expect(
        wrapper.findComponent(ContextMenu).props("position"),
      ).toStrictEqual({ x: 242, y: 122 });
    });

    it("handles @menuClose event from ContextMenu properly", async () => {
      const { wrapper } = doShallowMount();

      wrapper.trigger("contextmenu", { clientX: 100, clientY: 200 });
      wrapper.vm.$store.dispatch("application/toggleContextMenu", {
        event: createEvent(100, 200),
      });
      await new Promise((r) => setTimeout(r, 0));

      wrapper.findComponent(ContextMenu).vm.$emit("menuClose");

      await wrapper.vm.$nextTick();
      expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);
    });

    it("prevents native context menu by default", async () => {
      const { wrapper } = doShallowMount();
      const preventDefault = vi.fn();
      await wrapper.trigger("contextmenu", { preventDefault });
      expect(preventDefault).toHaveBeenCalled();
    });

    it("allows native context menu if source element allows it", async () => {
      const { wrapper } = doShallowMount();
      const preventDefault = vi.fn();
      wrapper.element.classList.add("native-context-menu");
      await wrapper.trigger("contextmenu", { preventDefault });
      expect(preventDefault).not.toHaveBeenCalled();
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
      await Vue.nextTick();

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

      await Vue.nextTick();
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
      mountResult.$store.state.workflow.quickAddNodeMenu = {
        isOpen: true,
        props: {
          direction: "in",
          position: { x: 0, y: 0 },
          port: { index: 2 },
          nodeId: "node:0",
        },
        events: { menuClose: closeCallback },
      };
      await Vue.nextTick();

      return { ...mountResult, closeCallback };
    };

    it("renders menu if open", async () => {
      const { wrapper, $store } = doShallowMount();
      expect(wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(false);

      $store.state.workflow.quickAddNodeMenu = {
        isOpen: true,
        props: {
          direction: "in",
          position: { x: 0, y: 0 },
          port: { index: 2 },
          nodeId: "node:0",
        },
        events: {},
      };

      await Vue.nextTick();
      expect(wrapper.findComponent(QuickAddNodeMenu).exists()).toBe(true);
    });

    it("passes props", async () => {
      const { wrapper } = await mountAndOpenMenu();
      let quickAddNodeMenu = wrapper.findComponent(QuickAddNodeMenu);
      expect(quickAddNodeMenu.props()).toEqual({
        nodeId: "node:0",
        port: { index: 2 },
        position: {
          x: 0,
          y: 0,
        },
      });
    });

    it("binds events", async () => {
      const { wrapper, closeCallback } = await mountAndOpenMenu();
      let quickAddNodeMenu = wrapper.findComponent(QuickAddNodeMenu);
      quickAddNodeMenu.vm.$emit("menuClose");
      expect(closeCallback).toHaveBeenCalled();
    });
  });
});
