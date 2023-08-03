import { expect, describe, beforeEach, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import WorkflowToolbar from "../WorkflowToolbar.vue";
import ToolbarShortcutButton from "../ToolbarShortcutButton.vue";
import WorkflowBreadcrumb from "../WorkflowBreadcrumb.vue";
import ZoomMenu from "../ZoomMenu.vue";

describe("WorkflowToolbar.vue", () => {
  let workflow,
    storeConfig,
    props,
    doShallowMount,
    wrapper,
    $store,
    $shortcuts,
    selectedNodes,
    selectedConnections;

  beforeEach(() => {
    wrapper = null;
    props = {};

    selectedNodes = [];
    selectedConnections = [];
    workflow = {
      info: {
        containerType: "project",
      },
      nodes: {
        "root:1": {
          id: "root:1",
          allowedActions: {
            canExecute: false,
            canCancel: false,
            canReset: false,
            canDelete: false,
          },
        },
        "root:2": {
          id: "root:2",
          allowedActions: {
            canExecute: true,
            canCancel: true,
            canReset: true,
            canDelete: true,
          },
        },
      },
    };

    $shortcuts = {
      isEnabled: vi.fn().mockReturnValue(true),
    };

    storeConfig = {
      workflow: {
        state: {
          activeWorkflow: workflow,
        },
        getters: {
          isWorkflowEmpty: vi.fn(),
        },
      },
      application: {
        getters: {
          hasAnnotationModeEnabled: () => false,
          hasSelectionModeEnabled: () => true,
          hasPanModeEnabled: () => false,
        },
      },
      selection: {
        getters: {
          selectedNodes: () => selectedNodes,
          selectedConnections: () => selectedConnections,
        },
      },
    };

    doShallowMount = () => {
      $store = mockVuexStore(storeConfig);
      wrapper = shallowMount(WorkflowToolbar, {
        props,
        global: {
          plugins: [$store],
          mocks: { $shortcuts },
        },
      });
    };
  });

  const toNameProp = (tab) => tab.props("name");

  describe("toolbar Shortcut", () => {
    it("shortcut buttons match computed items", () => {
      doShallowMount();

      let shortcutButtons = wrapper.findAllComponents(ToolbarShortcutButton);
      expect(
        shortcutButtons.map((button) => button.props("name")),
      ).toStrictEqual(wrapper.vm.toolbarButtons);
    });

    it("hides toolbar shortcut buttons if no workflow is open", () => {
      storeConfig.workflow.state.activeWorkflow = null;
      doShallowMount();

      expect(wrapper.findComponent(ToolbarShortcutButton).exists()).toBe(false);
    });
  });

  describe("zoom", () => {
    it("renders zoomMenu", () => {
      doShallowMount();
      expect(wrapper.findComponent(ZoomMenu).exists()).toBe(true);
      expect(wrapper.findComponent(ZoomMenu).props("disabled")).toBe(false);
    });

    it("hides ZoomMenu if no workflow is open", () => {
      storeConfig.workflow.state.activeWorkflow = null;
      doShallowMount();

      expect(wrapper.findComponent(ZoomMenu).exists()).toBe(false);
    });

    it("disables ZoomMenu if workflow is empty", () => {
      storeConfig.workflow.getters.isWorkflowEmpty.mockReturnValue(true);
      doShallowMount();

      expect(wrapper.findComponent(ZoomMenu).props("disabled")).toBe(true);
    });
  });

  describe("breadcrumb", () => {
    it("hides breadcrumb if no workflow is open", () => {
      storeConfig.workflow.state.activeWorkflow = null;
      doShallowMount();

      expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(false);
    });

    it("hides breadcrumb by default", () => {
      doShallowMount();
      expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(false);
    });

    it("shows breadcrumb if required", () => {
      workflow.parents = [{ dummy: true }];
      doShallowMount();

      expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(true);
    });
  });

  describe("visibility of toolbar items", () => {
    it("shows nothing if no workflow is active", () => {
      storeConfig.workflow.state.activeWorkflow = null;
      doShallowMount();
      const toolbarShortcuts = wrapper
        .findAllComponents(ToolbarShortcutButton)

        .map((tb) => tb.props("name"));
      expect(toolbarShortcuts).toStrictEqual([]);
    });

    it("shows menu items if no node is selected and not inside a component", () => {
      doShallowMount();
      const toolbarShortcuts = wrapper
        .findAllComponents(ToolbarShortcutButton)
        .map(toNameProp);

      expect(toolbarShortcuts).toStrictEqual([
        "save",
        "undo",
        "redo",
        "executeAll",
        "cancelAll",
        "resetAll",
      ]);
    });

    it("shows layout editor button if inside a component", () => {
      storeConfig.workflow.state.activeWorkflow.info.containerType =
        "component";
      doShallowMount();
      const toolbarShortcuts = wrapper
        .findAllComponents(ToolbarShortcutButton)
        .map(toNameProp);

      expect(toolbarShortcuts).toContain("openLayoutEditor");
    });

    it("shows correct menu items if one node is selected", () => {
      let node = {
        id: "root:0",
        allowedActions: {},
      };
      storeConfig.selection.getters.selectedNodes = () => [node];
      doShallowMount();
      const toolbarShortcuts = wrapper
        .findAllComponents(ToolbarShortcutButton)
        .map(toNameProp);

      expect(toolbarShortcuts).toStrictEqual([
        "save",
        "undo",
        "redo",
        "executeSelected",
        "cancelSelected",
        "resetSelected",
        "createMetanode",
        "createComponent",
      ]);
    });

    it("shows correct menu items if multiple nodes are selected", () => {
      let node = {
        id: "root:0",
        allowedActions: {},
      };
      storeConfig.selection.getters.selectedNodes = () => [
        node,
        { ...node, id: "root:1" },
      ];
      doShallowMount();
      const toolbarShortcuts = wrapper
        .findAllComponents(ToolbarShortcutButton)
        .map(toNameProp);

      expect(toolbarShortcuts).toStrictEqual([
        "save",
        "undo",
        "redo",
        "executeSelected",
        "cancelSelected",
        "resetSelected",
        "createMetanode",
        "createComponent",
      ]);
    });
  });
});
