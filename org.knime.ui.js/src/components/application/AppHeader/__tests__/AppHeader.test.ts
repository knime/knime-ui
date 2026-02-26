import {
  type MockInstance,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";
import { useRoute } from "vue-router";

import { FunctionButton } from "@knime/components";

import type { Project } from "@/api/gateway-api/generated-api";
import CloseIcon from "@/assets/cancel.svg";
import CloseButton from "@/components/common/CloseButton.vue";
import { APP_ROUTES } from "@/router/appRoutes";
import { useApplicationStore } from "@/store/application/application";
import { useDirtyProjectsTrackingStore } from "@/store/application/dirtyProjectsTracking";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useSettingsStore } from "@/store/settings";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { createProject } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import AppHeader from "../AppHeader.vue";
import { AppHeaderContextMenu } from "../AppHeaderContextMenu";
import AppHeaderTab from "../AppHeaderTab.vue";

const mockedAPI = deepMocked(API);

const routerPush = vi.fn().mockImplementation(() => Promise.resolve());
Element.prototype.scrollIntoView = vi.fn();

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    useRouter: vi.fn(() => ({ push: routerPush })),
    useRoute: vi.fn(() => ({ name: APP_ROUTES.WorkflowPage, params: {} })),
  };
});

const $shortcuts = {
  get: () => ({}),
  isEnabled: vi.fn(),
  dispatch: vi.fn(),
  getText: vi.fn(),
};

vi.mock("@/services/shortcuts", () => ({
  useShortcuts: () => $shortcuts,
}));

describe("AppHeader.vue", () => {
  type ComponentProps = InstanceType<typeof AppHeader>["$props"];
  type MountOpts = {
    props?: Partial<ComponentProps>;
    customOpenProjects?: Project[] | null;
    $route?: { name: string };
    isLoadingWorkflow?: boolean;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const doMount = ({
    props = {},
    customOpenProjects = null,
    $route = { name: "" },
    isLoadingWorkflow = false,
  }: MountOpts = {}) => {
    const openProjects = customOpenProjects || [
      createProject({
        projectId: "1",
        name: "Test1",
        origin: { providerId: "local" },
      }),
      createProject({
        projectId: "2",
        name: "Test2",
        origin: { providerId: "local" },
      }),
      createProject({
        projectId: "3",
        name: "Test3",
        origin: { providerId: "local" },
      }),
    ];

    const dirtyProjectsMap = {
      1: false,
      2: true,
      3: false,
    };

    const mockedStores = mockStores();
    mockedStores.applicationStore.setOpenProjects(openProjects);
    mockedStores.applicationStore.setActiveProjectId("1");
    mockedStores.applicationStore.setExampleProjects([]);
    mockedStores.applicationStore.setCustomHelpMenuEntries({}); // To enable mounting the help menu

    // @ts-expect-error
    mockedStores.applicationStore.isUnknownProject = vi
      .fn()
      .mockReturnValue(false);

    useApplicationSettingsStore().devMode = false;

    useSettingsStore().settings.uiScale = 1.0;

    useSpaceProvidersStore().spaceProviders = {};

    const lifecycleStore = useLifecycleStore();
    lifecycleStore.isLoadingWorkflow = isLoadingWorkflow;
    lifecycleStore.switchWorkflow = vi.fn();

    useDirtyProjectsTrackingStore().dirtyProjectsMap = dirtyProjectsMap;

    const wrapper = mount(AppHeader, {
      props,
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: { $zIndices: {} },
      },
    });

    return {
      wrapper,
      $route,
      $shortcuts,
      openProjects,
      mockedStores,
    };
  };

  describe("tabs", () => {
    it("renders tabs of opened projects", () => {
      const { wrapper } = doMount();

      const tabs = wrapper.findAll(".tab-item");
      expect(tabs.length).toBe(3);
    });

    it("allows to close workflow", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(CloseIcon).exists()).toBe(true);
      wrapper.findAllComponents(CloseButton).at(1)!.trigger("click");
      expect(useDesktopInteractionsStore().closeProject).toHaveBeenCalledWith(
        "2",
      );
    });

    it("should navigate to workflow", () => {
      const { wrapper, openProjects } = doMount();
      const projectId = openProjects[2].projectId;

      wrapper.findAll(".tab-item").at(2)!.trigger("click");
      expect(routerPush).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId, workflowId: "root" },
        query: { version: null },
      });
    });

    it("allows to click home button and navigate to home page", () => {
      const { wrapper } = doMount();

      wrapper.find(".home-button").trigger("click");

      expect(routerPush).toHaveBeenCalledWith({
        name: APP_ROUTES.Home.GetStarted,
      });
    });

    it("render application title, if no active project name exists", () => {
      const { wrapper } = doMount({ customOpenProjects: [] });

      const title = wrapper.find(".application-name");
      expect(title.text()).toBe("KNIME Analytics Platform 5");
    });

    it("navigates to homepage during startup when there are no open projects", () => {
      const { wrapper } = doMount({ customOpenProjects: [] });
      expect(
        wrapper.findComponent<typeof FunctionButton>(".home-button").props(),
      ).toMatchObject({
        active: true,
      });
    });

    it("updates the active tab when the activeProject changes", async () => {
      // @ts-expect-error
      useRoute.mockReturnValueOnce({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "2" },
      });

      const { wrapper } = doMount();

      const secondTab = wrapper.findAllComponents(AppHeaderTab).at(1)!;

      await nextTick();
      expect(secondTab.props("isActive")).toBe(true);
    });

    it("scrolls into active tab", async () => {
      const params = { projectId: "2" };

      // @ts-expect-error
      useRoute.mockReturnValueOnce({
        name: APP_ROUTES.WorkflowPage,
        params,
      });

      const { wrapper } = doMount();
      const getActiveElement = () => wrapper.find(".active").element;

      await flushPromises();
      expect(getActiveElement().scrollIntoView).toHaveBeenCalledOnce();

      routerPush.mockImplementationOnce(() => {
        params.projectId = "3";
        return Promise.resolve();
      });

      // navigate to project with id "3"
      await wrapper.findAll(".tab-item").at(2)!.trigger("click");

      await flushPromises();
      expect(getActiveElement().scrollIntoView).toHaveBeenCalledTimes(2);
    });

    describe("drag and drop", () => {
      let getBoundingClientRectMock: MockInstance;

      beforeEach(() => {
        getBoundingClientRectMock = vi.spyOn(
          HTMLElement.prototype,
          "getBoundingClientRect",
        );
      });

      afterEach(() => {
        getBoundingClientRectMock.mockRestore();
      });

      it("works as expected if all tabs have same width", async () => {
        const { wrapper, openProjects } = doMount();
        getBoundingClientRectMock.mockReturnValue({ width: 100, left: 0 });
        const tabs = wrapper.findAllComponents(AppHeaderTab);

        await tabs.at(2)!.trigger("dragstart", {
          dataTransfer: {
            setDragImage: vi.fn(),
          },
        });
        await tabs.at(1)!.trigger("drag", { clientX: 199 });
        await tabs.at(0)!.trigger("drag", { clientX: 99 });
        await tabs.at(0)!.trigger("dragend");

        const newOrder = wrapper.findAll(".tab-item").map((tab) => tab.text());
        const expectedOpenProjects = [
          openProjects[2],
          openProjects[0],
          openProjects[1],
        ];
        expect(newOrder).toEqual(expectedOpenProjects.map(({ name }) => name));
        expect(useApplicationStore().openProjects).toEqual(
          expectedOpenProjects,
        );
        expect(mockedAPI.desktop.updateOpenProjectsOrder).toHaveBeenCalledWith({
          projectIds: expectedOpenProjects.map(({ projectId }) => projectId),
        });
      });

      it("works as expected moving left to right if dragged tab is smaller", async () => {
        const { wrapper, openProjects } = doMount();

        // mock tab widths
        [50, 100, 100].forEach((width) => {
          getBoundingClientRectMock.mockReturnValueOnce({ width });
        });
        // mock tabWrapper left
        getBoundingClientRectMock.mockReturnValueOnce({ left: 0 });

        const tabs = wrapper.findAllComponents(AppHeaderTab);

        await tabs.at(0)!.trigger("dragstart", {
          dataTransfer: {
            setDragImage: vi.fn(),
          },
        });
        await tabs.at(1)!.trigger("drag", { clientX: 101 });
        await tabs.at(2)!.trigger("drag", { clientX: 199 });
        await tabs.at(2)!.trigger("dragend");

        const newOrder = wrapper.findAll(".tab-item").map((tab) => tab.text());
        const expectedOpenProjects = [
          openProjects[1],
          openProjects[0],
          openProjects[2],
        ];
        expect(newOrder).toEqual(expectedOpenProjects.map(({ name }) => name));
        expect(useApplicationStore().openProjects).toEqual(
          expectedOpenProjects,
        );
        expect(mockedAPI.desktop.updateOpenProjectsOrder).toHaveBeenCalledWith({
          projectIds: expectedOpenProjects.map(({ projectId }) => projectId),
        });
      });

      it("works as expected moving right to left if dragged tab is smaller", async () => {
        const { wrapper, openProjects } = doMount();

        // mock tab widths
        [100, 100, 50].forEach((width) => {
          getBoundingClientRectMock.mockReturnValueOnce({ width });
        });
        // mock tabWrapper left
        getBoundingClientRectMock.mockReturnValueOnce({ left: 0 });

        const tabs = wrapper.findAllComponents(AppHeaderTab);

        await tabs.at(2)!.trigger("dragstart", {
          dataTransfer: {
            setDragImage: vi.fn(),
          },
        });
        await tabs.at(1)!.trigger("drag", { clientX: 149 });
        await tabs.at(0)!.trigger("drag", { clientX: 51 });
        await tabs.at(0)!.trigger("dragend");

        const newOrder = wrapper.findAll(".tab-item").map((tab) => tab.text());
        const expectedOpenProjects = [
          openProjects[0],
          openProjects[2],
          openProjects[1],
        ];
        expect(newOrder).toEqual(expectedOpenProjects.map(({ name }) => name));
        expect(useApplicationStore().openProjects).toEqual(
          expectedOpenProjects,
        );
        expect(mockedAPI.desktop.updateOpenProjectsOrder).toHaveBeenCalledWith({
          projectIds: expectedOpenProjects.map(({ projectId }) => projectId),
        });
      });

      it("resets order if drag is aborted", async () => {
        const { wrapper, openProjects } = doMount();
        getBoundingClientRectMock.mockReturnValue({ width: 100, left: 0 });
        const tabs = wrapper.findAllComponents(AppHeaderTab);

        await tabs.at(2)!.trigger("dragstart", {
          dataTransfer: {
            setDragImage: vi.fn(),
          },
        });
        await tabs.at(1)!.trigger("dragover", { clientX: 199 });
        await tabs.at(0)!.trigger("dragend", {
          dataTransfer: {
            dropEffect: "none",
          },
        });

        const newOrder = wrapper.findAll(".tab-item").map((tab) => tab.text());
        expect(newOrder).toEqual(openProjects.map(({ name }) => name));
        expect(useApplicationStore().openProjects).toEqual(openProjects);
        expect(mockedAPI.desktop.updateOpenProjectsOrder).toHaveBeenCalledWith({
          projectIds: openProjects.map(({ projectId }) => projectId),
        });
      });
    });
  });

  it("should setup a window resize listener and update window width", async () => {
    const { wrapper } = doMount();
    window.innerWidth = 100;
    window.dispatchEvent(new Event("resize"));

    await nextTick();
    expect(
      wrapper.findAllComponents(AppHeaderTab).at(0)!.props("windowWidth"),
    ).toBe(100);
  });

  it("should show plus button to create workflow", async () => {
    const { wrapper, $shortcuts } = doMount();

    expect(wrapper.find(".create-workflow-btn").exists()).toBe(true);

    await wrapper.find(".create-workflow-btn").trigger("click");

    expect($shortcuts.dispatch).toHaveBeenCalledWith("createWorkflow");
  });

  it("allows opens preferences", async () => {
    const { wrapper } = doMount();
    await wrapper.find('[data-test-id="open-preferences"]').trigger("click");
    expect(mockedAPI.desktop.openWebUIPreferencePage).toHaveBeenCalled();
  });

  describe("context menu", () => {
    it("should display context menu", async () => {
      const { wrapper } = doMount();

      HTMLElement.prototype.closest = () =>
        wrapper.findAllComponents(AppHeaderTab).at(0)!.element;

      expect(wrapper.findComponent(AppHeaderContextMenu).exists()).toBe(false);

      await wrapper
        .find("header")
        .trigger("contextmenu", { clientX: 218, clientY: 15 });

      expect(wrapper.findComponent(AppHeaderContextMenu).exists()).toBe(true);
      expect(
        wrapper.findComponent(AppHeaderContextMenu).props("projectId"),
      ).toBe("1");
      expect(
        wrapper.findComponent(AppHeaderContextMenu).props("position"),
      ).toEqual({ x: 218, y: 15 });

      wrapper.findComponent(AppHeaderContextMenu).vm.$emit("itemClick");
      await nextTick();
      expect(wrapper.findComponent(AppHeaderContextMenu).exists()).toBe(false);
    });
  });
});
