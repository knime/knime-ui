import { expect, describe, it, vi } from "vitest";
import * as Vue from "vue";
import { shallowMount, VueWrapper } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils/mockVuexStore";
import {
  createAvailablePortTypes,
  createComponentNode,
  createMetanode,
  createNativeNode,
  createWorkflow,
} from "@/test/factories";
import MenuItems from "webapps-common/ui/components/MenuItems.vue";
import type { AllowedWorkflowActions } from "@/api/gateway-api/generated-api";
import { PortType } from "@/api/gateway-api/generated-api";
import type { KnimeNode } from "@/api/custom-types";

import FloatingMenu from "@/components/common/FloatingMenu.vue";
import type { ShortcutName } from "@/shortcuts";
import { createShortcutsService } from "@/plugins/shortcuts";
import * as workflowStore from "@/store/workflow";
import * as selectionStore from "@/store/selection";
import * as canvasStore from "@/store/canvas";

import ContextMenu from "../ContextMenu.vue";

describe("ContextMenu.vue", () => {
  const createStore = (
    options: {
      allowedWorkflowActions?: Partial<AllowedWorkflowActions>;
      nodes?: Record<string, KnimeNode>;
    } = {},
  ) => {
    const $store = mockVuexStore({
      selection: selectionStore,
      workflow: workflowStore,
      canvas: canvasStore,
      application: {
        state: {
          hasClipboardSupport: true,
          availablePortTypes: createAvailablePortTypes({
            "org.some.otherPorType": {
              kind: PortType.KindEnum.Other,
              color: "blue",
              name: "Some other port",
            },
          }),
        },
      },
      aiAssistant: {
        state: {
          build: {
            isProcessing: false,
          },
        },
      },
    });

    $store.commit(
      "canvas/setScrollContainerElement",
      document.createElement("div"),
    );

    $store.commit(
      "workflow/setActiveWorkflow",
      createWorkflow({
        allowedActions: { canReset: true, ...options.allowedWorkflowActions },
        nodes: options.nodes,
      }),
    );

    $store.commit("workflow/setIsWorkflowPanelFocused", true);

    return { $store };
  };

  const doMount = ({ props = {}, store = null } = {}) => {
    const defaultProps = {
      position: {
        x: 10,
        y: 10,
      },
    };

    const mockRouter = { push: () => {} };

    const { $store: defaultStore } = createStore();

    const $store: typeof defaultStore = store ?? defaultStore;

    // @ts-ignore
    const $shortcuts = createShortcutsService({ $store, $router: mockRouter });

    const shortcutsSpy = vi.spyOn($shortcuts, "dispatch");

    const wrapper = shallowMount(ContextMenu, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [$store],
        mocks: { $shortcuts },
      },
    });

    return { wrapper, $store, shortcutsSpy };
  };

  const renderedMenuItems = (wrapper: VueWrapper<any>) =>
    wrapper.findComponent(MenuItems).props("items");

  describe("menu", () => {
    it("sets position", () => {
      const { wrapper } = doMount();
      expect(
        wrapper.findComponent(FloatingMenu).props("canvasPosition"),
      ).toStrictEqual({ x: 10, y: 10 });
      expect(wrapper.findComponent(FloatingMenu).props("preventOverflow")).toBe(
        true,
      );
    });

    it("re-emits menu-close", () => {
      const { wrapper } = doMount();
      wrapper.findComponent(FloatingMenu).vm.$emit("menu-close");
      expect(wrapper.emitted("menuClose")).toBeTruthy();
    });

    it("focuses menu items on position change", async () => {
      const { $store } = createStore();

      await $store.dispatch("selection/selectNode", "root:1");

      const { wrapper } = doMount({ store: $store });

      const focusMock = vi.fn();

      wrapper.findComponent(MenuItems).vm.$el.focus = focusMock;
      wrapper.setProps({ position: { x: 2, y: 3 } });
      await Vue.nextTick();

      expect(focusMock).toHaveBeenCalled();
    });
  });

  it("sets items on mounted", () => {
    const { wrapper } = doMount();

    expect(renderedMenuItems(wrapper).length).toBe(4);
  });

  it("sets items on position change", async () => {
    const { wrapper, $store } = doMount();

    const totalItemsBefore = renderedMenuItems(wrapper).length;

    $store.dispatch("selection/selectNode", "root:1");

    await wrapper.setProps({ position: { x: 2, y: 3 } });

    expect(renderedMenuItems(wrapper).length).not.toBe(totalItemsBefore);
  });

  it("items are not set reactively", async () => {
    const { wrapper, $store } = doMount();

    await $store.dispatch("selection/selectNode", "root:1");

    expect(
      renderedMenuItems(wrapper).map((item) => item.metadata.shortcutName),
    ).toStrictEqual([
      "executeAll",
      "resetAll",
      "paste",
      "addWorkflowAnnotation",
    ]);
  });

  it("uses right format for MenuItems", async () => {
    const { wrapper } = doMount();

    await Vue.nextTick();

    expect(renderedMenuItems(wrapper)).toEqual(
      expect.arrayContaining([
        {
          metadata: { shortcutName: "executeAll" },
          text: "Execute all",
          hotkeyText: "Shift F7",
          disabled: false,
        },
      ]),
    );
  });

  it("fires correct action based on store data and passes optional event detail and metadata", () => {
    const { wrapper, shortcutsSpy } = doMount();
    const mockEvent = { mock: true };
    wrapper.findComponent(MenuItems).vm.$emit("item-click", mockEvent, {
      metadata: { shortcutName: "executeAll" },
    });

    expect(shortcutsSpy).toHaveBeenCalledWith("executeAll", {
      event: mockEvent,
      metadata: { position: { x: 10, y: 10 } },
    });
  });

  it("closes menu after item has been clicked", () => {
    const { wrapper } = doMount();

    expect(wrapper.emitted("menuClose")).toBeFalsy();
    wrapper.findComponent(MenuItems).vm.$emit("item-click", null, {
      metadata: { shortcutName: "executeAll" },
    });

    expect(wrapper.emitted("menuClose")).toBeTruthy();
  });

  describe("visibility of menu items", () => {
    const assertItems = (
      items: Array<{
        metadata?: { shortcutName: ShortcutName | Omit<string, ShortcutName> };
        text?: string;
        separator?: boolean;
        children?: Array<any>;
      }>,
    ) => items.map((item) => expect.objectContaining(item));

    it("shows correct menu items if nothing is selected", () => {
      const { $store } = createStore({
        allowedWorkflowActions: { canCancel: true },
      });

      const { wrapper } = doMount({ store: $store });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "executeAll" } },
          { metadata: { shortcutName: "cancelAll" } },
          { metadata: { shortcutName: "resetAll" }, separator: true },
          { metadata: { shortcutName: "paste" }, separator: true },
          { metadata: { shortcutName: "addWorkflowAnnotation" } },
        ]),
      );
    });

    it("shows correct menu items if one node is selected", async () => {
      const { $store } = createStore();

      await $store.dispatch("selection/selectNode", "root:1");

      const { wrapper } = doMount({ store: $store });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "configureNode" } },
          { text: "Open port view", children: expect.anything() },
          { metadata: { shortcutName: "editNodeLabel" }, separator: true },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
        ]),
      );
    });

    it("shows correct menu items if selected node has loopInfo", async () => {
      const node = createNativeNode({
        id: "root:0",
        allowedActions: { canExecute: true, canCancel: true, canReset: true },
        loopInfo: {
          allowedActions: {
            canPause: true,
            canResume: true,
            canStep: true,
          },
        },
      });
      const { $store } = createStore({ nodes: { "root:0": node } });

      await $store.dispatch("selection/selectNode", "root:0");

      const { wrapper } = doMount({ store: $store });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "configureNode" } },
          { metadata: { shortcutName: "executeSelected" } },
          { text: "Open port view", children: expect.anything() },
          { metadata: { shortcutName: "resumeLoopExecution" } },
          { metadata: { shortcutName: "pauseLoopExecution" } },
          { metadata: { shortcutName: "stepLoopExecution" } },
          { metadata: { shortcutName: "cancelSelected" } },
          { metadata: { shortcutName: "resetSelected" } },
          { metadata: { shortcutName: "editNodeLabel" }, separator: true },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
        ]),
      );
    });

    it("shows correct menu items if selected node can be executed and has view", async () => {
      const node = createNativeNode({
        id: "root:0",
        allowedActions: { canExecute: true, canOpenView: true },
      });

      const { $store } = createStore({ nodes: { "root:0": node } });

      await $store.dispatch("selection/selectNode", "root:0");

      const { wrapper } = doMount({ store: $store });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "configureNode" } },
          { metadata: { shortcutName: "executeSelected" } },
          { metadata: { shortcutName: "executeAndOpenView" } },
          {
            text: "Open port view",
            children: expect.anything(),
            separator: true,
          },
          { metadata: { shortcutName: "editNodeLabel" } },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
        ]),
      );
    });

    it("shows correct menu items if selected node can configure legacy flow variables", async () => {
      const node = createNativeNode({
        id: "root:0",
        allowedActions: {
          canOpenLegacyFlowVariableDialog: true,
          canOpenView: true,
          canExecute: true,
        },
      });

      const { $store } = createStore({ nodes: { "root:0": node } });

      await $store.dispatch("selection/selectNode", "root:0");

      const { wrapper } = doMount({ store: $store });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "configureNode" } },
          { metadata: { shortcutName: "configureFlowVariables" } },
          { metadata: { shortcutName: "executeSelected" } },
          { metadata: { shortcutName: "executeAndOpenView" } },
          {
            text: "Open port view",
            children: expect.anything(),
            separator: true,
          },
          { metadata: { shortcutName: "editNodeLabel" }, separator: true },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
        ]),
      );
    });

    it("shows correct menu items for multiple selected nodes", async () => {
      const node1 = createNativeNode({
        id: "root:1",
        allowedActions: {
          canExecute: true,
        },
      });
      const node2 = createNativeNode({
        id: "root:2",
        allowedActions: {
          canExecute: true,
        },
      });
      const node3 = createNativeNode({
        id: "root:3",
        allowedActions: {
          canExecute: true,
        },
      });

      const { $store } = createStore({
        nodes: {
          [node1.id]: node1,
          [node2.id]: node2,
          [node3.id]: node3,
        },
      });

      await $store.dispatch("selection/selectNodes", [
        "root:1",
        "root:2",
        "root:3",
      ]);

      const { wrapper } = doMount({ store: $store });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "executeSelected" }, separator: true },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
        ]),
      );
    });

    it("shows correct menu items for multiple selected connections", async () => {
      const { $store } = createStore();

      const connections = $store.state.workflow.activeWorkflow.connections;
      Object.values(connections)
        .map(({ id }) => id)
        .forEach((id) => {
          $store.dispatch("selection/selectConnection", id);
        });

      const { wrapper } = doMount({ store: $store });

      await Vue.nextTick();

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([{ metadata: { shortcutName: "deleteSelected" } }]),
      );
    });

    it("shows correct menu items for single selected connections", async () => {
      const { $store } = createStore();
      const connections = $store.state.workflow.activeWorkflow.connections;
      $store.dispatch(
        "selection/selectConnection",
        Object.keys(connections).at(0),
      );

      const { wrapper } = doMount({ store: $store });

      await Vue.nextTick();

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([{ metadata: { shortcutName: "deleteSelected" } }]),
      );
    });

    it("shows options for metanodes", async () => {
      const node = createMetanode({ id: "root:0" });

      const { $store } = createStore({ nodes: { [node.id]: node } });

      await $store.dispatch("selection/selectNode", "root:0");

      const { wrapper } = doMount({ store: $store });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "configureNode" } },
          {
            text: "Open port view",
            children: expect.anything(),
            separator: true,
          },
          { metadata: { shortcutName: "editNodeLabel" } },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
          { text: "Metanode" },
        ]),
      );
    });

    it("shows options for components", async () => {
      const node = createComponentNode({ id: "root:0" });

      const { $store } = createStore({ nodes: { [node.id]: node } });

      await $store.dispatch("selection/selectNode", "root:0");

      const { wrapper } = doMount({ store: $store });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "configureNode" } },
          {
            text: "Open port view",
            children: expect.anything(),
            separator: true,
          },
          { metadata: { shortcutName: "editNodeLabel" }, separator: true },
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
          { text: "Component" },
        ]),
      );
    });

    it("shows correct menu items if one annotation is selected", () => {
      const { $store } = createStore();

      $store.dispatch("selection/selectAnnotation", "annotation:1");

      const { wrapper } = doMount({ store: $store });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { text: "Arrange annotations" },
        ]),
      );
    });

    it("shows correct menu items if different object types are selected", async () => {
      const { $store } = createStore();

      await $store.dispatch("selection/selectAnnotation", "annotation:1");
      await $store.dispatch("selection/selectNodes", ["root:1", "root:2"]);

      const { wrapper } = doMount({ store: $store });

      expect(renderedMenuItems(wrapper)).toEqual(
        assertItems([
          { metadata: { shortcutName: "cut" } },
          { metadata: { shortcutName: "copy" } },
          { metadata: { shortcutName: "deleteSelected" }, separator: true },
          { text: "Arrange annotations", separator: true },
          { metadata: { shortcutName: "createMetanode" } },
          { metadata: { shortcutName: "createComponent" } },
        ]),
      );
    });
  });
});
