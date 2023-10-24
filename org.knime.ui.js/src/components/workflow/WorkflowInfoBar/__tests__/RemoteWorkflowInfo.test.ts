import { mockVuexStore } from "@/test/utils";
import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import {
  createSpaceProvider,
  createWorkflow,
  createWorkflowProject,
} from "@/test/factories";
import * as workflowStore from "@/store/workflow";
import * as applicationStore from "@/store/application";
import { SpaceProviderNS, type Workflow } from "@/api/custom-types";
import * as spacesStore from "@/store/spaces";

import RemoteWorkflowInfo from "../RemoteWorkflowInfo.vue";

describe("RemoteWorkflowInfo.vue", () => {
  const openProjects = [
    createWorkflowProject({
      projectId: "no-origin",
    }),
    createWorkflowProject({
      projectId: "hub-project",
      origin: {
        itemId: "1234",
        spaceId: "space1",
        providerId: "hub-provider1",
      },
    }),
    createWorkflowProject({
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
    const $store = mockVuexStore({
      workflow: {
        ...workflowStore,
        actions: {
          saveWorkflowAs: vi.fn(),
        },
      },
      application: applicationStore,
      spaces: spacesStore,
    });

    $store.commit("application/setActiveProjectId", activeProjectId);
    $store.commit("application/setOpenProjects", openProjects);
    $store.commit("workflow/setActiveWorkflow", workflow);

    const projectPathValue = openProjects.find(
      ({ projectId }) => projectId === activeProjectId,
    )?.origin;

    // update providers state to stay in sync with application state
    if (projectPathValue) {
      $store.commit("spaces/setProjectPath", {
        projectId: activeProjectId,
        value: {
          spaceId: projectPathValue.spaceId,
          spaceProviderId: projectPathValue.providerId,
          itemId: projectPathValue.itemId,
        },
      });
      $store.state.spaces.spaceProviders = {
        [openProjects.at(1).origin.providerId]: createSpaceProvider({
          id: "hub-provider1",
          name: "Hub space",
          type: SpaceProviderNS.TypeEnum.HUB,
        }),
        [openProjects.at(2).origin.providerId]: createSpaceProvider({
          id: "server-provider1",
          name: "Server space",
          type: SpaceProviderNS.TypeEnum.SERVER,
        }),
      };
    }

    const dispatchSpy = vi.spyOn($store, "dispatch");

    const wrapper = mount(RemoteWorkflowInfo, {
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store, dispatchSpy };
  };

  it("should display banner for workflows with unknown origin correctly", async () => {
    const activeProjectId = openProjects.at(0).projectId;
    const workflow = createWorkflow({
      info: { containerId: activeProjectId },
    });

    const { wrapper, dispatchSpy } = doMount({
      workflow,
      activeProjectId,
    });

    expect(wrapper.find(".banner").exists()).toBe(true);
    expect(wrapper.find(".banner.yellow").exists()).toBe(true);
    expect(wrapper.find(".banner.blue").exists()).toBe(false);
    expect(wrapper.find(".banner.yellow .flush-left").exists()).toBe(true);
    expect(wrapper.text()).toMatch(
      "You have opened a workflow that is not part of your spaces. “Save as” a local copy to keep your changes.",
    );

    const saveAsButton = wrapper.find(".button");
    expect(saveAsButton.exists()).toBe(true);

    await saveAsButton.trigger("click");
    expect(dispatchSpy).toHaveBeenCalledWith("workflow/saveWorkflowAs");
  });

  it("should not display the banner for hub workflows with known origin", () => {
    const activeProjectId = openProjects.at(1).projectId;
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
    const activeProjectId = openProjects.at(2).projectId;
    const workflow = createWorkflow({
      info: { containerId: activeProjectId },
    });

    const { wrapper } = doMount({
      workflow,
      activeProjectId,
    });

    expect(wrapper.find(".banner").exists()).toBe(true);
    expect(wrapper.find(".banner.yellow").exists()).toBe(false);
    expect(wrapper.find(".banner.blue").exists()).toBe(true);
    expect(wrapper.text()).toMatch(
      "You have opened a workflow from a KNIME Server. “Save” the workflow back to KNIME Server to keep your changes.",
    );
    expect(wrapper.find(".button").exists()).toBe(false);
  });
});
