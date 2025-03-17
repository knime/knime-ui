import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { SpaceProviderNS, type Workflow } from "@/api/custom-types";
import {
  createProject,
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
  createWorkflow,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import RemoteWorkflowInfo from "../RemoteWorkflowInfo.vue";

describe("RemoteWorkflowInfo.vue", () => {
  const openProjects = [
    createProject({
      projectId: "no-origin",
    }),
    createProject({
      projectId: "hub-project",
      origin: {
        itemId: "1234",
        spaceId: "space1",
        providerId: "hub-provider1",
      },
    }),
    createProject({
      projectId: "server-project",
      origin: {
        itemId: "1234",
        spaceId: "space1",
        providerId: "server-provider1",
      },
    }),
  ];

  const doMount = ({
    workflow,
    activeProjectId,
  }: {
    workflow: Workflow;
    activeProjectId: string;
  }) => {
    const mockedStores = mockStores();

    mockedStores.applicationStore.setActiveProjectId(activeProjectId);
    mockedStores.applicationStore.setOpenProjects(openProjects);
    mockedStores.workflowStore.setActiveWorkflow(workflow);

    // update providers state to stay in sync with application state
    mockedStores.spaceProvidersStore.spaceProviders = {
      [openProjects.at(1)!.origin!.providerId]: createSpaceProvider({
        id: "hub-provider1",
        name: "Hub space",
        type: SpaceProviderNS.TypeEnum.HUB,
        spaceGroups: [
          createSpaceGroup({ spaces: [createSpace({ id: "space1" })] }),
        ],
      }),
      [openProjects.at(2)!.origin!.providerId]: createSpaceProvider({
        id: "server-provider1",
        name: "Server space",
        type: SpaceProviderNS.TypeEnum.SERVER,
        spaceGroups: [createSpaceGroup({ spaces: [createSpace()] })],
      }),
    };

    const wrapper = mount(RemoteWorkflowInfo, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  it("should display banner for projects with unknown origin", () => {
    const activeProjectId = openProjects.at(0)!.projectId;
    const workflow = createWorkflow({
      info: { containerId: activeProjectId },
    });

    const { wrapper } = doMount({
      workflow,
      activeProjectId,
    });

    expect(wrapper.find(".banner").exists()).toBe(true);
    expect(wrapper.text()).toMatch(
      "You have opened a workflow that is not part of your spaces. “Save” a local copy to keep your changes.",
    );
  });

  it("shouldn't display banner for workflows that are closing", async () => {
    const activeProjectId = openProjects.at(0)!.projectId;
    const workflow = createWorkflow({
      info: { containerId: activeProjectId },
    });

    const { wrapper, mockedStores } = doMount({
      workflow,
      activeProjectId,
    });

    expect(wrapper.find(".banner").exists()).toBe(true);

    mockedStores.applicationStore.setOpenProjects([]);
    await nextTick();

    expect(wrapper.find(".banner").exists()).toBe(false);
  });

  it("should display banner for projects that belong to an unknown space", async () => {
    const project = createProject({
      projectId: "server-project",
      origin: {
        itemId: "1234",
        spaceId: "some-space",
        providerId: "server-provider1",
      },
    });
    const activeProjectId = project.projectId;
    const workflow = createWorkflow({
      info: { containerId: activeProjectId },
    });

    const { wrapper, mockedStores } = doMount({
      workflow,
      activeProjectId,
    });

    mockedStores.applicationStore.setOpenProjects([project]);
    await nextTick();

    expect(wrapper.find(".banner").exists()).toBe(true);
    expect(wrapper.text()).toMatch(
      "You have opened a workflow that is not part of your spaces. “Save” a local copy to keep your changes.",
    );
  });

  it("should not display the banner for hub workflows with known origin", () => {
    const activeProjectId = openProjects.at(1)!.projectId;
    const workflow = createWorkflow({
      info: { containerId: activeProjectId },
    });

    const { wrapper } = doMount({
      workflow,
      activeProjectId,
    });

    expect(wrapper.find(".banner").exists()).toBe(false);
  });

  it("should display banner for workflows from a KNIME server correctly", () => {
    const activeProjectId = openProjects.at(2)!.projectId;
    const workflow = createWorkflow({
      info: { containerId: activeProjectId },
    });

    const { wrapper } = doMount({
      workflow,
      activeProjectId,
    });

    expect(wrapper.find(".banner").exists()).toBe(true);
    expect(wrapper.text()).toMatch(
      "You have opened a workflow from a KNIME Server. “Save” the workflow back to KNIME Server to keep your changes.",
    );
  });

  it("should not display banner when space data is being loaded for the provider the workflow belongs to", async () => {
    const activeProjectId = openProjects.at(1)!.projectId;
    const workflow = createWorkflow({
      info: { containerId: activeProjectId },
    });

    const { wrapper, mockedStores } = doMount({
      workflow,
      activeProjectId,
    });

    mockedStores.spaceProvidersStore.loadingProviderSpacesData[
      "hub-provider1"
    ] = true;
    await nextTick();

    expect(wrapper.find(".banner").exists()).toBe(false);
  });

  it("should hide bar when ui control is set", async () => {
    const activeProjectId = openProjects.at(2)!.projectId;
    const workflow = createWorkflow({
      info: { containerId: activeProjectId },
    });

    const { wrapper, mockedStores } = doMount({
      workflow,
      activeProjectId,
    });

    mockedStores.uiControlsStore.shouldDisplayRemoteWorkflowInfoBar = false;
    await nextTick();

    expect(wrapper.find(".banner").exists()).toBe(false);
  });
});
