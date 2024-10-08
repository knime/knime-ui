import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import PlusIcon from "@knime/styles/img/icons/node-stack.svg";

import Metainfo from "@/assets/metainfo.svg";
import * as applicationStore from "@/store/application";
import * as nodeRepositoryStore from "@/store/nodeRepository";
import * as panelStore from "@/store/panel";
import * as uiControlsStore from "@/store/uiControls";
import { mockVuexStore } from "@/test/utils/mockVuexStore";
import Sidebar from "../Sidebar.vue";
import SidebarExtensionPanel from "../SidebarExtensionPanel.vue";

describe("Sidebar", () => {
  const doMount = ({
    props = {},
    isWorkflowEmptyMock = vi.fn().mockReturnValue(false),
    mockFeatureFlags = {
      isKaiPermitted: () => false,
    },
  } = {}) => {
    const $store = mockVuexStore({
      panel: panelStore,
      nodeRepository: nodeRepositoryStore,
      workflow: {
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
        getters: {
          isWorkflowEmpty: isWorkflowEmptyMock,
        },
      },
      application: {
        state: {
          ...applicationStore.state(),
          activeProjectId: "activeProject1",
        },
      },
      uiControls: uiControlsStore,
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const commitSpy = vi.spyOn($store, "commit");

    const wrapper = mount(Sidebar, {
      props: {
        ...props,
      },
      global: {
        plugins: [$store],
        mocks: { $features: mockFeatureFlags },
        stubs: {
          ContextAwareDescription: true,
          NodeRepository: true,
          SidebarSpaceExplorer: true,
          AiAssistant: true,
        },
      },
    });

    const activateTab = async (tabName: string) => {
      await wrapper.find(`[title="${tabName}"] > input`).trigger("click");
    };

    return { wrapper, $store, dispatchSpy, commitSpy, activateTab };
  };

  it("renders default", () => {
    const { wrapper } = doMount();
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.findComponent(Metainfo).exists()).toBe(true);
    expect(wrapper.findComponent(PlusIcon).exists()).toBe(true);

    expect(wrapper.find('[title="Description"]').classes("active")).toBe(true);
    expect(wrapper.find('[title="Nodes"]').classes("active")).toBe(false);
    wrapper.findAll("li").forEach((wp) => {
      expect(wp.classes("expanded")).toBe(true);
    });
  });

  it("expands and activates tab", async () => {
    const tabName = "Nodes";
    const { wrapper, activateTab } = doMount();
    expect(wrapper.find(`[title="${tabName}"]`).classes("expanded")).toBe(true);

    await activateTab(tabName);
    expect(wrapper.find(`[title="${tabName}"]`).classes("expanded")).toBe(true);
    expect(wrapper.find(`[title="${tabName}"]`).classes("active")).toBe(true);
  });

  it("clicking on open tab should close it", async () => {
    const tabName = "Description";
    const { wrapper, activateTab } = doMount();
    await activateTab(tabName);
    expect(wrapper.find(`[title="${tabName}"]`).classes("expanded")).toBe(
      false,
    );

    await activateTab(tabName);
    expect(wrapper.find(`[title="${tabName}"]`).classes("expanded")).toBe(true);
  });

  it("click on node repository icon when description panel is open closes both panels", async () => {
    const { $store, activateTab } = doMount();
    // open node repository
    await activateTab("Nodes");
    // emulate opening the description panel
    await $store.dispatch("panel/openExtensionPanel");
    expect($store.state.panel.isExtensionPanelOpen).toBe(true);

    await activateTab("Nodes");
    expect($store.state.panel.isExtensionPanelOpen).toBe(false);
  });

  it("click on a different tab when extension panel is open, closes the extension panel", async () => {
    const { $store, activateTab } = doMount();

    await activateTab("Nodes");
    // emulate opening the description panel
    await $store.dispatch("panel/openExtensionPanel");

    // back to Description
    await activateTab("Description");

    // back to node repository
    await activateTab("Nodes");

    expect($store.state.panel.isExtensionPanelOpen).toBe(false);
  });

  it("has portal for extension panel", () => {
    const { wrapper } = doMount();
    expect(wrapper.findComponent(SidebarExtensionPanel).exists()).toBe(true);
  });

  it("should show node repository if workflow is empty", () => {
    const { wrapper } = doMount({
      isWorkflowEmptyMock: vi.fn().mockReturnValue(true),
    });

    expect(wrapper.find('[title="Nodes"]').classes("active")).toBe(true);
    expect(wrapper.find('[title="Description"]').classes("active")).toBe(false);
    wrapper.findAll("li").forEach((wp) => {
      expect(wp.classes("expanded")).toBe(true);
    });
  });
});
