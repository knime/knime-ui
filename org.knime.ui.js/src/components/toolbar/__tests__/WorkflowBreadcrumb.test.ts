import { describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";

import { SubMenu } from "@knime/components";

import type { Workflow } from "@/api/custom-types";
import { SpaceProvider, WorkflowInfo } from "@/api/gateway-api/generated-api";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import {
  createProject,
  createSpaceProvider,
  createWorkflow,
} from "@/test/factories";
import ComponentBreadcrumb from "../ComponentBreadcrumb.vue";
import WorkflowBreadcrumb from "../WorkflowBreadcrumb.vue";

const revealInSpaceExplorerSpy = vi.fn();

vi.mock("@/components/spaces/useRevealInSpaceExplorer", () => ({
  useRevealInSpaceExplorer: () => ({
    revealInSpaceExplorer: revealInSpaceExplorerSpy,
  }),
}));

describe("WorkflowBreadcrumb.vue", () => {
  type MountOpts = {
    workflow: Workflow;
    providerType?: keyof typeof SpaceProvider.TypeEnum;
    projectId?: string;
  };
  const doMount = ({
    workflow,
    providerType = SpaceProvider.TypeEnum.LOCAL,
    projectId,
  }: MountOpts) => {
    const activeProject = createProject({
      origin: { providerId: providerType },
      projectId,
    });
    const openProjects = [activeProject];

    const LOCAL_PROVIDER = createSpaceProvider({
      type: SpaceProvider.TypeEnum.LOCAL,
    });

    const HUB_PROVIDER = createSpaceProvider({
      type: SpaceProvider.TypeEnum.HUB,
    });

    const SERVER_PROVIDER = createSpaceProvider({
      type: SpaceProvider.TypeEnum.SERVER,
    });

    const SPACE_PROVIDERS = {
      [SpaceProvider.TypeEnum.LOCAL]: LOCAL_PROVIDER,
      [SpaceProvider.TypeEnum.HUB]: HUB_PROVIDER,
      [SpaceProvider.TypeEnum.SERVER]: SERVER_PROVIDER,
    };

    const wrapper = shallowMount(WorkflowBreadcrumb, {
      props: { workflow },
      global: {
        plugins: [
          createTestingPinia({
            stubActions: false,
            createSpy: vi.fn,
            initialState: {
              application: {
                activeProjectId: activeProject.projectId,
                openProjects,
              },
              "space.providers": { spaceProviders: SPACE_PROVIDERS },
            },
          }),
        ],
      },
    });

    return { wrapper };
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

  it('handles "Version history" dropdown item click', () => {
    const { wrapper } = doMount({
      workflow: createWorkflow({
        info: { name: "dummy workflow" },
      }),
    });
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
    const { wrapper } = doMount({
      workflow: createWorkflow({
        info: { name: "dummy workflow" },
      }),
    });

    const revealInSpaceExplorerItem = wrapper
      .findComponent(SubMenu)
      .props("items");
    revealInSpaceExplorerItem
      .find((item) => item.text === "Reveal in space explorer")
      ?.metadata.handler();

    expect(revealInSpaceExplorerSpy).toHaveBeenCalled();
  });

  it('handles "Close project" dropdown item click', () => {
    const { wrapper } = doMount({
      workflow: createWorkflow({
        info: { name: "dummy workflow" },
      }),
      projectId: "123456578",
    });

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
});
