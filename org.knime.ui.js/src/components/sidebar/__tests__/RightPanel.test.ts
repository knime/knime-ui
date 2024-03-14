import { expect, describe, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils/mockVuexStore";
import * as applicationStore from "@/store/application";
import * as workflowStore from "@/store/workflow";

import RightPanel from "../RightPanel.vue";
import NodeDialogLoader from "@/components/uiExtensions/nodeDialogs/NodeDialogLoader.vue";

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
      "The node can't be configured with a modern dialog",
    );
  });

  it("shows download AP link for legacy dialogs in the browser", async () => {
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

    const RightPanel = (await import("../RightPanel.vue")).default;

    const { wrapper } = doMount(
      {
        singleSelectedNodeMock: vi.fn().mockReturnValue({
          id: 2,
          kind: "node",
        }),
      },
      RightPanel,
    );

    expect(wrapper.findComponent(RightPanel).exists()).toBe(true);
    expect(wrapper.find(".placeholder-text").text()).toBe(
      "To also configure nodes with a classic dialog, you have to download the KNIME Analytics Platform",
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
