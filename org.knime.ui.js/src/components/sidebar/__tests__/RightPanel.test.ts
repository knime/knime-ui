import { expect, describe, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils/mockVuexStore";
import * as applicationStore from "@/store/application";
import * as workflowStore from "@/store/workflow";

import RightPanel from "../RightPanel.vue";
import NodeDialogLoader from "@/components/uiExtensions/nodeDialogs/NodeDialogLoader.vue";

describe("RightPanel", () => {
  const doMount = ({ props = {}, singleSelectedNodeMock = vi.fn() } = {}) => {
    const $store = mockVuexStore({
      workflow: {
        ...workflowStore,
        state: {
          activeWorkflow: {
            projectMetadata: {
              title: "title",
            },
            info: {
              name: "fileName",
              containerType: "project",
            },
          },
        },
      },
      application: applicationStore,
      selection: {
        getters: {
          singleSelectedNode: singleSelectedNodeMock,
        },
      },
    });

    const wrapper = shallowMount(RightPanel, {
      props: {
        ...props,
      },
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store };
  };

  it("renders default", () => {
    const { wrapper } = doMount();
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.findComponent(RightPanel).exists()).toBe(true);
    expect(wrapper.find(".placeholder-text").text()).toBe(
      "Please select a node",
    );
  });

  it("shows different placeholder text when node without dialog is selected", () => {
    const { wrapper } = doMount({
      singleSelectedNodeMock: vi.fn().mockReturnValue({
        id: 2,
        kind: "node",
      }),
    });

    expect(wrapper.findComponent(RightPanel).exists()).toBe(true);
    expect(wrapper.find(".placeholder-text").text()).toBe(
      "Node dialog cannot be displayed. Please open the configuration from the action bar",
    );
  });

  it("shows NodeDialogLoader component if selected node has dialog", () => {
    const { wrapper } = doMount({
      singleSelectedNodeMock: vi.fn().mockReturnValue({
        id: 1,
        kind: "node",
        hasDialog: true,
      }),
    });

    expect(wrapper.findComponent(RightPanel).exists()).toBe(true);
    expect(wrapper.findComponent(NodeDialogLoader).exists()).toBe(true);
  });
});
