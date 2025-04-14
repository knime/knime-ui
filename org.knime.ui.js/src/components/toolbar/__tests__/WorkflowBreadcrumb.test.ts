import { beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { SubMenu } from "@knime/components";
import HubIcon from "@knime/styles/img/icons/cloud-knime.svg";
import LocalSpaceIcon from "@knime/styles/img/icons/local-space.svg";
import ServerIcon from "@knime/styles/img/icons/server-racks.svg";

import { SpaceProvider, WorkflowInfo } from "@/api/gateway-api/generated-api";
import { isBrowser, isDesktop } from "@/environment";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import {
  createProject,
  createSpaceProvider,
  createWorkflow,
} from "@/test/factories";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { mockStores } from "@/test/utils/mockStores";
import ComponentBreadcrumb from "../ComponentBreadcrumb.vue";
import WorkflowBreadcrumb from "../WorkflowBreadcrumb.vue";

vi.mock("@/environment");

const revealInSpaceExplorerSpy = vi.fn();

vi.mock(
  "@/components/spaces/useRevealInSpaceExplorer",
  async (importOriginal) => {
    const original = await importOriginal<
      typeof import("@/components/spaces/useRevealInSpaceExplorer")
    >();
    return {
      useRevealInSpaceExplorer: () => ({
        ...original.useRevealInSpaceExplorer(),
        revealItemInSpaceExplorer: revealInSpaceExplorerSpy,
      }),
    };
  },
);

const LOCAL_PROVIDER = createSpaceProvider({
  type: SpaceProvider.TypeEnum.LOCAL,
});
const HUB_PROVIDER = createSpaceProvider({
  type: SpaceProvider.TypeEnum.HUB,
});
const SERVER_PROVIDER = createSpaceProvider({
  type: SpaceProvider.TypeEnum.SERVER,
});

describe("WorkflowBreadcrumb.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnvironment("DESKTOP", { isDesktop, isBrowser });
  });

  const doMount = ({
    workflow = createWorkflow({
      info: { name: "dummy workflow" },
    }),
    provider = LOCAL_PROVIDER,
  } = {}) => {
    const mockedStores = mockStores();

    const activeProject = createProject({
      origin: { providerId: provider.id },
      projectId: "123456578",
    });

    mockedStores.applicationStore.activeProjectId = activeProject.projectId;
    mockedStores.applicationStore.openProjects = [activeProject];
    // @ts-expect-error
    mockedStores.spaceProvidersStore.activeProjectProvider = provider;
    mockedStores.spaceProvidersStore.setSpaceProviders({
      [provider.id]: provider,
    });

    const wrapper = shallowMount(WorkflowBreadcrumb, {
      props: { workflow },
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return {
      wrapper,
      mockedStores,
    };
  };

  it("renders ComponentBreadcrumb when in a Component or Metanode", () => {
    const { wrapper } = doMount({
      workflow: createWorkflow({
        parents: [
          {
            name: "parent1",
            containerId: "container",
            containerType: WorkflowInfo.ContainerTypeEnum.Project,
          },
        ],
      }),
    });
    expect(wrapper.findComponent(ComponentBreadcrumb).exists()).toBe(true);
  });

  it("renders dropdown items in DESKTOP", () => {
    const { wrapper } = doMount();
    const menuItems = wrapper.findComponent(SubMenu).props("items");

    expect(menuItems).toEqual([
      expect.objectContaining({ text: "Version history" }),
      expect.objectContaining({ text: "Reveal in space explorer" }),
      expect.objectContaining({ text: "Close project" }),
    ]);
  });

  it("renders dropdown items in BROWSER", () => {
    mockEnvironment("BROWSER", { isDesktop, isBrowser });

    const { wrapper } = doMount();
    const menuItems = wrapper.findComponent(SubMenu).props("items");

    expect(menuItems).toEqual([
      expect.objectContaining({ text: "Version history" }),
    ]);
  });

  it('handles "Version history" dropdown item click', () => {
    const { wrapper } = doMount();
    const versionsStore = useWorkflowVersionsStore();
    vi.mocked(versionsStore.activateVersionsMode).mockImplementation(vi.fn());

    wrapper
      .findComponent(SubMenu)
      .props("items")
      .find((item) => item.text === "Version history")
      ?.metadata.handler();

    expect(versionsStore.activateVersionsMode).toHaveBeenCalled();
  });

  it('handles "Reveal in space explorer" dropdown item click', () => {
    const { wrapper } = doMount();

    const revealInSpaceExplorerItem = wrapper
      .findComponent(SubMenu)
      .props("items");
    revealInSpaceExplorerItem
      .find((item) => item.text === "Reveal in space explorer")
      ?.metadata.handler();

    expect(revealInSpaceExplorerSpy).toHaveBeenCalled();
  });

  it('handles "Close project" dropdown item click', () => {
    const { wrapper } = doMount();

    const revealInSpaceExplorerItem = wrapper
      .findComponent(SubMenu)
      .props("items");
    revealInSpaceExplorerItem
      .find((item) => item.text === "Close project")
      ?.metadata.handler();

    expect(useDesktopInteractionsStore().closeProject).toHaveBeenCalledWith(
      "123456578",
    );
  });

  it("renders LocalSpace icon and text when providerType is LOCAL", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(LocalSpaceIcon).exists()).toBe(true);
    expect(wrapper.text()).toContain("Local");
  });

  it("renders Hub icon and text when providerType is HUB", () => {
    const { wrapper } = doMount({
      provider: HUB_PROVIDER,
    });

    expect(wrapper.findComponent(HubIcon).exists()).toBe(true);
    expect(wrapper.text()).toContain("Hub");
  });

  it("renders Server icon and text when providerType is SERVER", () => {
    const { wrapper } = doMount({
      provider: SERVER_PROVIDER,
    });

    expect(wrapper.findComponent(ServerIcon).exists()).toBe(true);
    expect(wrapper.text()).toContain("Server");
  });
});
