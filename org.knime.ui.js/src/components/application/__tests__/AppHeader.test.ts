import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { useRoute } from "vue-router";

import { FunctionButton } from "@knime/components";

import { API } from "@/api";
import type { Project } from "@/api/gateway-api/generated-api";
import CloseIcon from "@/assets/cancel.svg";
import CloseButton from "@/components/common/CloseButton.vue";
import { APP_ROUTES } from "@/router/appRoutes";
import { createProject } from "@/test/factories";
import { deepMocked, mockVuexStore } from "@/test/utils";
import AppHeader from "../AppHeader.vue";
import AppHeaderContextMenu from "../AppHeaderContextMenu.vue";
import AppHeaderTab from "../AppHeaderTab.vue";

const mockedAPI = deepMocked(API);

const routerPush = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useRouter: vi.fn(() => ({ push: routerPush })),
    useRoute: vi.fn(() => ({ name: APP_ROUTES.WorkflowPage, params: {} })),
  };
});

const $shortcuts = {
  get: () => ({}),
  isEnabled: vi.fn(),
  dispatch: vi.fn(),
};

vi.mock("@/plugins/shortcuts", () => ({
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
    const storeConfig = {
      application: {
        state: {
          openProjects,
          activeProjectId: "1",
          devMode: false,
          isLoadingWorkflow,
          dirtyProjectsMap,
          exampleProjects: [],
          customHelpMenuEntries: {}, // To enable mounting the help menu
        },
        actions: { switchWorkflow: vi.fn() },
      },
      workflow: {
        actions: { closeProject: vi.fn() },
      },
      settings: {
        state: {
          settings: {
            uiScale: 1.0,
          },
        },
      },
    };

    const $store = mockVuexStore(storeConfig);
    const wrapper = mount(AppHeader, {
      props,
      global: { plugins: [$store] },
    });

    return { storeConfig, wrapper, $store, $route, $shortcuts };
  };

  describe("tabs", () => {
    it("renders tabs of opened projects", () => {
      const { wrapper } = doMount();

      const tabs = wrapper.findAll(".tab-item");
      expect(tabs.length).toBe(3);
    });

    it("allows to close workflow", () => {
      const { wrapper, storeConfig } = doMount();

      expect(wrapper.findComponent(CloseIcon).exists()).toBe(true);
      wrapper.findAllComponents(CloseButton).at(1)!.trigger("click");
      expect(storeConfig.workflow.actions.closeProject).toHaveBeenCalledWith(
        expect.anything(),
        "2",
      );
    });

    it("should navigate to workflow", () => {
      const { wrapper, storeConfig } = doMount();
      const projectId = storeConfig.application.state.openProjects[2].projectId;

      wrapper.findAll(".tab-item").at(2)!.trigger("click");
      expect(routerPush).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId, workflowId: "root" },
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
      useRoute.mockReturnValueOnce({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "2" },
      });
      const { wrapper } = doMount();
      await wrapper.findAll(".tab-item").at(2)!.trigger("click");
      const activeDiv = wrapper.find(".active").element;

      expect(activeDiv.scrollIntoView).toHaveBeenCalledOnce();
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

  describe("right side buttons", () => {
    it("allows opens preferences", async () => {
      const { wrapper } = doMount();
      await wrapper.find('[data-test-id="open-preferences"]').trigger("click");
      expect(mockedAPI.desktop.openWebUIPreferencePage).toHaveBeenCalled();
    });

    it("hides all dev mode buttons if dev mode is disabled", async () => {
      const { wrapper, $store } = doMount();
      expect(
        wrapper.find('[data-test-id="dev-mode-only"]').exists(),
      ).toBeFalsy();

      $store.state.application.devMode = true;
      await nextTick();

      expect(
        wrapper.find('[data-test-id="dev-mode-only"]').exists(),
      ).toBeTruthy();
    });
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
