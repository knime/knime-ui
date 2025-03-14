import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import { SubMenu } from "@knime/components";

import type { Workflow } from "@/api/custom-types";
import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import ToolbarButton from "@/components/common/ToolbarButton.vue";
import { createShortcutsService } from "@/plugins/shortcuts";
import { router } from "@/router/router";
import {
  createProject,
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
  createWorkflow,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import ToolbarShortcutButton from "../ToolbarShortcutButton.vue";
import WorkflowBreadcrumb from "../WorkflowBreadcrumb.vue";
import WorkflowToolbar from "../WorkflowToolbar.vue";
import ZoomMenu from "../ZoomMenu.vue";

vi.mock("@knime/components", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-ignore
    ...actual,
    useToasts: vi.fn(),
    useHint: () => ({ createHint: vi.fn(), isCompleted: vi.fn(() => true) }),
  };
});

describe("WorkflowToolbar.vue", () => {
  const doMount = ({
    getCommunityHubInfo = {
      isOnlyCommunityHubMounted: true,
    },
  } = {}) => {
    const mockedStores = mockStores();

    // @ts-expect-error
    mockedStores.spaceProvidersStore.getCommunityHubInfo = getCommunityHubInfo;

    const projectId = "project1";
    mockedStores.applicationStore.setActiveProjectId(projectId);

    const local = createSpaceProvider();
    mockedStores.spaceProvidersStore.setSpaceProviders({
      [local.id]: local,
    });
    mockedStores.spaceCachingStore.projectPath = {
      [projectId]: {
        spaceId: "local",
        spaceProviderId: "local",
        itemId: "root",
      },
    };

    const $shortcuts = createShortcutsService({
      $router: router,
      // @ts-expect-error
      $toast: {},
    });

    const wrapper = shallowMount(WorkflowToolbar, {
      global: {
        plugins: [mockedStores.testingPinia, router],
        mocks: {
          $shortcuts,
        },
      },
    });

    return { wrapper, $shortcuts, ...mockedStores };
  };

  const toNameProp = (tab) => tab.props("name");

  describe("toolbar Shortcut", () => {
    it("shortcut buttons match computed items", () => {
      const { wrapper } = doMount();

      const shortcutButtons = wrapper.findAllComponents(ToolbarShortcutButton);
      expect(
        shortcutButtons.map((button) => button.props("name")),
        // @ts-ignore
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
      const { wrapper, workflowStore } = doMount();
      workflowStore.setActiveWorkflow(workflow);
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
      const { wrapper, workflowStore } = doMount();
      workflowStore.setActiveWorkflow(workflow);
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
      const { wrapper, workflowStore } = doMount();
      workflowStore.setActiveWorkflow(workflow);
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
      const { wrapper, workflowStore } = doMount();
      workflowStore.setActiveWorkflow(workflow);
      await nextTick();

      expect(wrapper.findComponent(WorkflowBreadcrumb).exists()).toBe(true);
    });
  });

  describe("visibility of toolbar items", () => {
    const setupStore = async ({
      mockedStores,
      workflow,
    }: {
      mockedStores: ReturnType<typeof mockStores>;
      workflow: Workflow;
    }) => {
      // create a workflow to set active
      // const workflow = createWorkflow();
      mockedStores.workflowStore.setActiveWorkflow(workflow);

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
      mockedStores.applicationStore.setOpenProjects(openProjects);

      // set the project as active
      mockedStores.applicationStore.setActiveProjectId(workflow.projectId);

      // set space providers containing a space that matches the one in the
      // active workflow origin
      mockedStores.spaceProvidersStore.setSpaceProviders({
        "hub-provider1": createSpaceProvider({
          id: "hub-provider1",
          spaceGroups: [
            createSpaceGroup({ spaces: [createSpace({ id: "space1" })] }),
          ],
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
      const { wrapper, $shortcuts, ...mockedStores } = doMount();

      await setupStore({ mockedStores, workflow: createWorkflow() });

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
      const { wrapper, workflowStore, applicationStore } = doMount();

      const workflow = createWorkflow();
      workflowStore.setActiveWorkflow(workflow);

      const openProjects = [
        createProject({
          projectId: workflow.projectId,
        }),
      ];

      applicationStore.setOpenProjects(openProjects);
      applicationStore.setActiveProjectId(workflow.projectId);

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
      const { wrapper, $shortcuts, ...mockedStores } = doMount();
      const workflow = createWorkflow({
        info: { containerType: WorkflowInfo.ContainerTypeEnum.Component },
      });
      await setupStore({ mockedStores, workflow });

      const toolbarShortcuts = wrapper
        .findAllComponents(ToolbarShortcutButton)
        .map(toNameProp);

      expect(toolbarShortcuts).toContain("openLayoutEditor");
    });

    it("shows correct menu items if one node is selected", async () => {
      const { wrapper, $shortcuts, ...mockedStores } = doMount();
      const workflow = createWorkflow();
      await setupStore({ mockedStores, workflow });

      mockedStores.selectionStore.selectNode("root:1");

      await nextTick();

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
      const { wrapper, $shortcuts, ...mockedStores } = doMount();

      const workflow = createWorkflow();
      await setupStore({ mockedStores, workflow });
      mockedStores.selectionStore.selectNodes(["root:1", "root:2"]);

      await nextTick();

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
      const { wrapper, canvasModesStore } = doMount();

      wrapper
        .findComponent(SubMenu)
        .vm.$emit("item-click", {}, { metadata: { id: "annotation" } });

      expect(canvasModesStore.canvasMode).toBe("annotation");
    });
  });

  describe("upload button", () => {
    it("doesnt show any button if not only Community Hub is mounted", () => {
      const { wrapper } = doMount({
        getCommunityHubInfo: {
          isOnlyCommunityHubMounted: false,
        },
      });

      expect(wrapper.findComponent(ToolbarButton).exists()).toBe(false);
    });

    it("should show upload button if only Community Hub is mounted and workflow is local", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(ToolbarButton).exists()).toBe(true);
      expect(wrapper.findComponent(ToolbarButton).attributes("title")).toBe(
        "Upload",
      );
      expect(wrapper.findComponent(ToolbarButton).text()).toBe("Upload");
    });
  });
});
