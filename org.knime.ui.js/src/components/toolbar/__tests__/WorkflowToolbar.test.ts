import { expect, describe, it, vi } from "vitest";
import { nextTick } from "vue";
import type { Store } from "vuex";
import { mount } from "@vue/test-utils";

import { SubMenu } from "@knime/components";

import { router } from "@/router/router";
import * as applicationStore from "@/store/application";
import * as canvasStore from "@/store/canvas";
import * as workflowStore from "@/store/workflow";
import * as spacesStore from "@/store/spaces";
import * as selectionStore from "@/store/selection";
import { mockVuexStore } from "@/test/utils";
import {
  createSpace,
  createSpaceProvider,
  createWorkflow,
  createProject,
} from "@/test/factories";
import { createShortcutsService } from "@/plugins/shortcuts";
import type { Workflow } from "@/api/custom-types";
import { WorkflowInfo } from "@/api/gateway-api/generated-api";

import WorkflowToolbar from "../WorkflowToolbar.vue";
import ToolbarShortcutButton from "../ToolbarShortcutButton.vue";
import ZoomMenu from "../ZoomMenu.vue";
import WorkflowBreadcrumb from "../WorkflowBreadcrumb.vue";

vi.mock("@knime/components", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-ignore
    ...actual,
    useToasts: vi.fn(),
  };
});

describe("WorkflowToolbar.vue", () => {
  const doMount = () => {
    const $store = mockVuexStore({
      workflow: workflowStore,
      application: applicationStore,
      selection: selectionStore,
      canvas: canvasStore,
      spaces: spacesStore,
    });

    const $shortcuts = createShortcutsService({
      $store,
      $router: router,
      // @ts-expect-error
      $toast: {},
    });

    const wrapper = mount(WorkflowToolbar, {
      global: {
        plugins: [$store, router],
        mocks: {
          $shortcuts,
        },
      },
    });

    return { wrapper, $store, $shortcuts };
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
    it("renders zoomMenu", async () => {
      const workflow = createWorkflow();
      const { wrapper, $store } = doMount();
      $store.commit("workflow/setActiveWorkflow", workflow);
      await nextTick();

      expect(wrapper.findComponent(ZoomMenu).exists()).toBe(true);
      expect(wrapper.findComponent(ZoomMenu).props("disabled")).toBe(false);
    });

    it("hides ZoomMenu if no workflow is open", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(ZoomMenu).exists()).toBe(false);
    });

    it("disables ZoomMenu if workflow is empty", async () => {
      const workflow = createWorkflow();
      workflow.nodes = {};
      workflow.workflowAnnotations = [];
      const { wrapper, $store } = doMount();
      $store.commit("workflow/setActiveWorkflow", workflow);
      await nextTick();

      expect(wrapper.findComponent(ZoomMenu).props("disabled")).toBe(true);
    });
  });

  describe("breadcrumb", () => {
    it("hides breadcrumb if no workflow is open", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(false);
    });

    it("hides breadcrumb by default", async () => {
      const workflow = createWorkflow();
      const { wrapper, $store } = doMount();
      $store.commit("workflow/setActiveWorkflow", workflow);
      await nextTick();
      expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(false);
    });

    it("shows breadcrumb if required", async () => {
      const workflow = createWorkflow();
      workflow.parents = [
        {
          name: "parent",
          containerId: "",
          containerType: WorkflowInfo.ContainerTypeEnum.Project,
        },
      ];
      const { wrapper, $store } = doMount();
      $store.commit("workflow/setActiveWorkflow", workflow);
      await nextTick();

      expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(true);
    });
  });

  describe("visibility of toolbar items", () => {
    const setupStore = async ({
      $store,
      workflow,
    }: {
      $store: Store<any>;
      workflow: Workflow;
    }) => {
      // create a workflow to set active
      // const workflow = createWorkflow();
      $store.commit("workflow/setActiveWorkflow", workflow);

      // create open projects matching the workflow that is active (by projectId)
      const openProjects = [
        createProject({
          projectId: workflow.projectId,
          origin: {
            itemId: "1234",
            spaceId: "space1",
            providerId: "hub-provider1",
          },
        }),
      ];
      $store.commit("application/setOpenProjects", openProjects);

      // set the project as active
      $store.commit("application/setActiveProjectId", workflow.projectId);

      // set space providers containing a space that matches the one in the
      // active workflow origin
      $store.commit("spaces/setSpaceProviders", {
        "hub-provider1": createSpaceProvider({
          id: "hub-provider1",
          spaces: [createSpace({ id: "space1" })],
        }),
      });

      await nextTick();
    };

    it("shows nothing if no workflow is active", () => {
      const { wrapper } = doMount();
      const toolbarShortcuts = wrapper
        .findAllComponents(ToolbarShortcutButton)

        .map((tb) => tb.props("name"));
      expect(toolbarShortcuts).toStrictEqual([]);
    });

    it("shows menu items if no node is selected and not inside a component", async () => {
      const { wrapper, $store } = doMount();

      await setupStore({ $store, workflow: createWorkflow() });

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

    it("shows menu items if workflow is an unknown project", async () => {
      const { wrapper, $store } = doMount();

      const workflow = createWorkflow();
      $store.commit("workflow/setActiveWorkflow", workflow);

      const openProjects = [
        createProject({
          projectId: workflow.projectId,
        }),
      ];

      $store.commit("application/setOpenProjects", openProjects);
      $store.commit("application/setActiveProjectId", workflow.projectId);

      await nextTick();

      const toolbarShortcuts = wrapper
        .findAllComponents(ToolbarShortcutButton)
        .map(toNameProp);

      expect(toolbarShortcuts).toStrictEqual([
        "saveAs",
        "undo",
        "redo",
        "executeAll",
        "cancelAll",
        "resetAll",
      ]);
    });

    it("shows layout editor button if inside a component", async () => {
      const { wrapper, $store } = doMount();
      const workflow = createWorkflow({
        info: { containerType: WorkflowInfo.ContainerTypeEnum.Component },
      });
      await setupStore({ $store, workflow });

      const toolbarShortcuts = wrapper
        .findAllComponents(ToolbarShortcutButton)
        .map(toNameProp);

      expect(toolbarShortcuts).toContain("openLayoutEditor");
    });

    it("shows correct menu items if one node is selected", async () => {
      const { wrapper, $store } = doMount();

      const workflow = createWorkflow();
      await setupStore({ $store, workflow });
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
      const { wrapper, $store } = doMount();

      const workflow = createWorkflow();
      await setupStore({ $store, workflow });
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

  describe("canvas modes", () => {
    it("should show canvas modes", () => {
      const { wrapper, $shortcuts } = doMount();

      expect(wrapper.findComponent(SubMenu).exists()).toBe(true);
      expect(wrapper.findComponent(SubMenu).props("items")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            disabled: !$shortcuts.isEnabled("switchToSelectionMode"),
            metadata: { id: "selection" },
          }),
          expect.objectContaining({
            disabled: !$shortcuts.isEnabled("switchToAnnotationMode"),
            metadata: { id: "annotation" },
          }),
          expect.objectContaining({
            disabled: !$shortcuts.isEnabled("switchToPanMode"),
            metadata: { id: "pan" },
          }),
        ]),
      );
    });

    it("should change the canvas mode", () => {
      const { wrapper, $store } = doMount();

      wrapper
        .findComponent(SubMenu)
        .vm.$emit("item-click", {}, { metadata: { id: "annotation" } });

      expect($store.state.application.canvasMode).toBe("annotation");
    });
  });
});
