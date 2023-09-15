import { expect, describe, it } from "vitest";
import { mount } from "@vue/test-utils";

import { router } from "@/router";
import * as applicationStore from "@/store/application";
import * as canvasStore from "@/store/canvas";
import * as workflowStore from "@/store/workflow";
import * as selectionStore from "@/store/selection";
import { mockVuexStore } from "@/test/utils";
import { createShortcutsService } from "@/plugins/shortcuts";

import WorkflowToolbar from "../WorkflowToolbar.vue";
import ToolbarShortcutButton from "../ToolbarShortcutButton.vue";
import ZoomMenu from "../ZoomMenu.vue";
import { createWorkflow } from "@/test/factories";
import WorkflowBreadcrumb from "../WorkflowBreadcrumb.vue";
import { WorkflowInfo } from "@/api/gateway-api/generated-api";

describe("WorkflowToolbar.vue", () => {
  const doMount = ({ workflow = null } = {}) => {
    const $store = mockVuexStore({
      workflow: workflowStore,
      application: applicationStore,
      selection: selectionStore,
      canvas: canvasStore,
    });

    if (workflow) {
      $store.commit("workflow/setActiveWorkflow", workflow);
    }

    const wrapper = mount(WorkflowToolbar, {
      global: {
        plugins: [$store, router],
        mocks: {
          $shortcuts: createShortcutsService({ $store, $router: router }),
        },
      },
    });

    return { wrapper, $store };
  };

  const toNameProp = (tab) => tab.props("name");

  describe("toolbar Shortcut", () => {
    it("shortcut buttons match computed items", () => {
      const { wrapper } = doMount();

      const shortcutButtons = wrapper.findAllComponents(ToolbarShortcutButton);
      expect(
        shortcutButtons.map((button) => button.props("name")),
      ).toStrictEqual(wrapper.vm.toolbarButtons);
    });

    it("hides toolbar shortcut buttons if no workflow is open", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(ToolbarShortcutButton).exists()).toBe(false);
    });
  });

  describe("zoom", () => {
    it("renders zoomMenu", () => {
      const workflow = createWorkflow();
      const { wrapper } = doMount({ workflow });
      expect(wrapper.findComponent(ZoomMenu).exists()).toBe(true);
      expect(wrapper.findComponent(ZoomMenu).props("disabled")).toBe(false);
    });

    it("hides ZoomMenu if no workflow is open", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(ZoomMenu).exists()).toBe(false);
    });

    it("disables ZoomMenu if workflow is empty", () => {
      const workflow = createWorkflow();
      workflow.nodes = {};
      workflow.workflowAnnotations = [];
      const { wrapper } = doMount({ workflow });

      expect(wrapper.findComponent(ZoomMenu).props("disabled")).toBe(true);
    });
  });

  describe("breadcrumb", () => {
    it("hides breadcrumb if no workflow is open", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(false);
    });

    it("hides breadcrumb by default", () => {
      const workflow = createWorkflow();
      const { wrapper } = doMount({ workflow });
      expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(false);
    });

    it("shows breadcrumb if required", () => {
      const workflow = createWorkflow();
      workflow.parents = [
        {
          name: "parent",
          containerId: "",
          containerType: WorkflowInfo.ContainerTypeEnum.Project,
        },
      ];
      const { wrapper } = doMount({ workflow });

      expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(true);
    });
  });

  describe("visibility of toolbar items", () => {
    it("shows nothing if no workflow is active", () => {
      const { wrapper } = doMount();
      const toolbarShortcuts = wrapper
        .findAllComponents(ToolbarShortcutButton)

        .map((tb) => tb.props("name"));
      expect(toolbarShortcuts).toStrictEqual([]);
    });

    it("shows menu items if no node is selected and not inside a component", () => {
      const workflow = createWorkflow();
      const { wrapper } = doMount({ workflow });
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
      const workflow = createWorkflow({
        info: { containerType: WorkflowInfo.ContainerTypeEnum.Component },
      });
      const { wrapper } = doMount({ workflow });

      const toolbarShortcuts = wrapper
        .findAllComponents(ToolbarShortcutButton)
        .map(toNameProp);

      expect(toolbarShortcuts).toContain("openLayoutEditor");
    });

    it("shows correct menu items if one node is selected", async () => {
      const workflow = createWorkflow();
      const { wrapper, $store } = doMount({ workflow });
      await $store.dispatch("selection/selectNode", ["root:1"]);

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

    it("shows correct menu items if multiple nodes are selected", async () => {
      const workflow = createWorkflow();
      const { wrapper, $store } = doMount({ workflow });
      await $store.dispatch("selection/selectNodes", ["root:1", "root:2"]);

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
