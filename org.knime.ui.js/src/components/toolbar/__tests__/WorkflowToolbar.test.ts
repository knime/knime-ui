import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, flushPromises, shallowMount } from "@vue/test-utils";

import { SubMenu } from "@knime/components";

import { type Workflow } from "@/api/custom-types";
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
    // @ts-expect-error
    ...actual,
    useToasts: vi.fn(),
    useHint: () => ({ createHint: vi.fn(), isCompleted: vi.fn(() => true) }),
  };
});

const { showConfirmDialogMock } = vi.hoisted(() => ({
  showConfirmDialogMock: vi.fn(() => Promise.resolve({ confirmed: true })),
}));
vi.mock("@/composables/useConfirmDialog", () => ({
  useConfirmDialog: () => ({ show: showConfirmDialogMock }),
}));

describe("WorkflowToolbar.vue", () => {
  afterEach(vi.restoreAllMocks);

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
      shallow: true,
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
        // @ts-expect-error
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

    it("shows breadcrumb by default", async () => {
      const workflow = createWorkflow();
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
      const { wrapper, ...mockedStores } = doMount();

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
      const { wrapper, ...mockedStores } = doMount();
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
      const { wrapper, ...mockedStores } = doMount();
      const workflow = createWorkflow();
      await setupStore({ mockedStores, workflow });

      await mockedStores.selectionStore.selectNodes(["root:1"]);
      await flushPromises();

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
      const { wrapper, ...mockedStores } = doMount();

      const workflow = createWorkflow();
      await setupStore({ mockedStores, workflow });
      await mockedStores.selectionStore.selectNodes(["root:1", "root:2"]);
      await flushPromises();

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
    const getUploadButton = (wrapper: VueWrapper) =>
      wrapper.findComponent({ ref: "uploadButton" });
    const localWorkflow = createWorkflow({
      info: { providerType: WorkflowInfo.ProviderTypeEnum.LOCAL },
    });
    const mockProject = createProject({
      projectId: "projectId",
      origin: { itemId: "itemId" },
    });

    it("isn't visible if not only Community Hub is mounted", () => {
      const { wrapper } = doMount({
        getCommunityHubInfo: {
          isOnlyCommunityHubMounted: false,
        },
      });

      expect(getUploadButton(wrapper).exists()).toBe(false);
    });

    it("is visible if only Community Hub is mounted and workflow is local", async () => {
      const { wrapper, workflowStore } = doMount();

      workflowStore.setActiveWorkflow(localWorkflow);
      await nextTick();

      const uploadButton = getUploadButton(wrapper);

      expect(uploadButton.exists()).toBe(true);
      expect(uploadButton.attributes("title")).toBe("Upload");
      expect(uploadButton.text()).toBe("Upload");
    });

    it("shows a prompt if the current workflow is dirty and saves on confirm", async () => {
      const {
        wrapper,
        applicationStore,
        workflowStore,
        dirtyProjectsTrackingStore,
        desktopInteractionsStore,
      } = doMount();

      workflowStore.setActiveWorkflow(localWorkflow);
      applicationStore.setOpenProjects([mockProject]);
      applicationStore.setActiveProjectId(mockProject.projectId);
      dirtyProjectsTrackingStore.updateDirtyProjectsMap({
        [mockProject.projectId]: true,
      });
      await nextTick();

      const uploadButton = getUploadButton(wrapper);
      uploadButton.trigger("click");
      // Await confirmation and workflow save calls
      await flushPromises();

      expect(showConfirmDialogMock).toHaveBeenCalled();
      expect(desktopInteractionsStore.saveProject).toHaveBeenCalled();
    });

    it("shows a prompt if the current workflow is dirty and doesn't save on cancel", async () => {
      showConfirmDialogMock.mockResolvedValue({ confirmed: false });

      const {
        wrapper,
        applicationStore,
        workflowStore,
        dirtyProjectsTrackingStore,
        desktopInteractionsStore,
      } = doMount();

      workflowStore.setActiveWorkflow(localWorkflow);
      applicationStore.setOpenProjects([mockProject]);
      applicationStore.setActiveProjectId(mockProject.projectId);
      dirtyProjectsTrackingStore.updateDirtyProjectsMap({
        [mockProject.projectId]: true,
      });
      await nextTick();

      const uploadButton = getUploadButton(wrapper);
      uploadButton.trigger("click");

      expect(showConfirmDialogMock).toHaveBeenCalled();
      expect(desktopInteractionsStore.saveProject).not.toHaveBeenCalled();
    });

    it("doesn't show a prompt if the current workflow is clean", async () => {
      const {
        wrapper,
        applicationStore,
        workflowStore,
        dirtyProjectsTrackingStore,
      } = doMount();

      workflowStore.setActiveWorkflow(localWorkflow);
      applicationStore.setOpenProjects([mockProject]);
      applicationStore.setActiveProjectId(mockProject.projectId);
      dirtyProjectsTrackingStore.updateDirtyProjectsMap({
        [mockProject.projectId]: false,
      });
      await nextTick();

      const uploadButton = getUploadButton(wrapper);
      uploadButton.trigger("click");

      expect(showConfirmDialogMock).not.toHaveBeenCalled();
    });
  });

  describe("deploy button", () => {
    const getDeployButton = (wrapper: VueWrapper) => {
      return wrapper
        .findAllComponents(ToolbarButton)
        .filter((w) => w.text() === "Deploy on Hub")
        .at(0);
    };

    const projectId = "projectId";
    const openProjects = [
      createProject({ projectId, origin: { spaceId: "space1" } }),
    ];
    const localWorkflow = createWorkflow({
      info: { providerType: WorkflowInfo.ProviderTypeEnum.LOCAL },
    });
    const hubWorkflow = createWorkflow({
      info: { providerType: WorkflowInfo.ProviderTypeEnum.HUB },
    });

    it("doesn't show if not only Community Hub is mounted", () => {
      const { wrapper } = doMount({
        getCommunityHubInfo: { isOnlyCommunityHubMounted: false },
      });

      expect(getDeployButton(wrapper)).toBeUndefined();
    });

    it("doesn't show if workflow isn't from hub", async () => {
      const { wrapper, ...mockedStores } = doMount();

      // set active workflow to local
      mockedStores.applicationStore.setActiveProjectId(projectId);
      mockedStores.applicationStore.setOpenProjects(openProjects);
      mockedStores.workflowStore.setActiveWorkflow(localWorkflow);
      await flushPromises();

      expect(getDeployButton(wrapper)).toBeUndefined();
    });

    it("doesn't show if project is unknown", async () => {
      const { wrapper, ...mockedStores } = doMount();

      // set active workflow to unknown
      mockedStores.applicationStore.setActiveProjectId(projectId);
      mockedStores.applicationStore.setOpenProjects([
        createProject({ projectId, origin: { spaceId: "restrictedSpace" } }),
      ]);
      mockedStores.workflowStore.setActiveWorkflow(hubWorkflow);
      await flushPromises();

      expect(getDeployButton(wrapper)).toBeUndefined();
    });

    it("shows if only Community Hub is mounted and workflow is from hub", async () => {
      const { wrapper, ...mockedStores } = doMount();

      // set active workflow to hub
      mockedStores.applicationStore.setActiveProjectId(projectId);
      mockedStores.applicationStore.setOpenProjects(openProjects);
      mockedStores.workflowStore.setActiveWorkflow(hubWorkflow);
      await flushPromises();

      const deployButton = getDeployButton(wrapper);

      expect(deployButton?.exists()).toBe(true);
      expect(deployButton?.attributes("title")).toBe("Deploy on Hub");
    });
  });
});
