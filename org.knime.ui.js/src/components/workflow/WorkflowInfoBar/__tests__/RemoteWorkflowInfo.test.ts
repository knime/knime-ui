import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import { mockVuexStore } from "@/test/utils";

import {
  createSpace,
  createSpaceProvider,
  createWorkflow,
  createProject,
} from "@/test/factories";
import * as workflowStore from "@/store/workflow";
import * as applicationStore from "@/store/application";
import { SpaceProviderNS, type Workflow } from "@/api/custom-types";
import * as spacesStore from "@/store/spaces";

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
    component = null,
  }: {
    workflow: Workflow;
    activeProjectId: string;
    component?: typeof RemoteWorkflowInfo | null;
  }) => {
    const $store = mockVuexStore({
      workflow: workflowStore,
      application: applicationStore,
      spaces: spacesStore,
    });

    $store.commit("application/setActiveProjectId", activeProjectId);
    $store.commit("application/setOpenProjects", openProjects);
    $store.commit("workflow/setActiveWorkflow", workflow);

    // update providers state to stay in sync with application state
    $store.state.spaces.spaceProviders = {
      [openProjects.at(1)!.origin!.providerId]: createSpaceProvider({
        id: "hub-provider1",
        name: "Hub space",
        type: SpaceProviderNS.TypeEnum.HUB,
        spaces: [createSpace({ id: "space1" })],
      }),
      [openProjects.at(2)!.origin!.providerId]: createSpaceProvider({
        id: "server-provider1",
        name: "Server space",
        type: SpaceProviderNS.TypeEnum.SERVER,
        spaces: [createSpace()],
      }),
    };

    const wrapper = mount(component ?? RemoteWorkflowInfo, {
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store };
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

    const { wrapper, $store } = doMount({
      workflow,
      activeProjectId,
    });

    $store.commit("application/setOpenProjects", [project]);
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

  it("should hide bar for browser environment", async () => {
    vi.resetModules();
    vi.doMock("@/environment", async () => {
      const actual = await vi.importActual("@/environment");

      return {
        ...actual,
        environment: "BROWSER",
        isDesktop: false,
        isBrowser: true,
      };
    });

    const RemoteWorkflowInfo = (await import("../RemoteWorkflowInfo.vue"))
      .default;

    const activeProjectId = openProjects.at(2)!.projectId;
    const workflow = createWorkflow({
      info: { containerId: activeProjectId },
    });

    const { wrapper, $store } = doMount({
      workflow,
      activeProjectId,
      component: RemoteWorkflowInfo,
    });

    $store.state.application.permissions.showRemoteWorkflowInfo = false;
    await nextTick();

    expect(wrapper.find(".banner").exists()).toBe(false);
  });
});
