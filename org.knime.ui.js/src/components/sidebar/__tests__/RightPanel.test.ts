import { expect, describe, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { NodeState } from "@/api/gateway-api/generated-api";
import { mockVuexStore } from "@/test/utils/mockVuexStore";
import * as applicationStore from "@/store/application";
import * as workflowStore from "@/store/workflow";

import RightPanel from "../RightPanel.vue";
import NodeConfigWrapper from "@/components/uiExtensions/nodeConfig/NodeConfigWrapper.vue";
import { nextTick } from "vue";

describe("RightPanel", () => {
  const doMount = (
    { props = {}, singleSelectedNodeMock = vi.fn() } = {},
    component: typeof RightPanel | null = null,
  ) => {
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

    const wrapper = shallowMount(component ?? RightPanel, {
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
      "Please select a node.",
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
      "This node dialog is not supported here.",
    );
  });

  it("shows download AP link for legacy dialogs when permission is set", async () => {
    const { wrapper, $store } = doMount({
      singleSelectedNodeMock: vi.fn().mockReturnValue({
        id: 2,
        kind: "node",
      }),
    });

    $store.state.application.permissions.showFloatingDownloadButton = true;
    await nextTick();

    expect(wrapper.findComponent(RightPanel).exists()).toBe(true);
    expect(wrapper.find(".placeholder-text").text()).toBe(
      "To configure nodes with a classic dialog, download the KNIME Analytics Platform.",
    );
  });

  it("shows NodeConfigWrapper component if selected node has dialog", () => {
    const { wrapper } = doMount({
      singleSelectedNodeMock: vi.fn().mockReturnValue({
        id: 1,
        kind: "node",
        hasDialog: true,
      }),
    });

    expect(wrapper.findComponent(RightPanel).exists()).toBe(true);
    expect(wrapper.findComponent(NodeConfigWrapper).exists()).toBe(true);
  });

  describe("disables functions during node execution", () => {
    it("disables NodeDialogLoader component", () => {
      const { wrapper } = doMount({
        singleSelectedNodeMock: vi.fn().mockReturnValue({
          id: 1,
          kind: "node",
          hasDialog: true,
          state: { executionState: NodeState.ExecutionStateEnum.EXECUTING },
        }),
      });

      expect(wrapper.findComponent(RightPanel).exists()).toBe(true);
      expect(wrapper.findComponent(NodeConfigWrapper).exists()).toBe(true);
      expect(wrapper.find(".panel-dialog-disabled").exists()).toBe(true);
    });
  });

  it("shows a message if selected node is a metanode in a browser", async () => {
    const { wrapper, $store } = doMount({
      singleSelectedNodeMock: vi.fn().mockReturnValue({
        id: 2,
        kind: "metanode",
      }),
    });

    $store.state.application.permissions.showFloatingDownloadButton = true;
    await nextTick();

    expect(wrapper.findComponent(RightPanel).exists()).toBe(true);
    expect(wrapper.find(".placeholder-text").text()).toBe(
      "Please select a node.",
    );
  });
});
