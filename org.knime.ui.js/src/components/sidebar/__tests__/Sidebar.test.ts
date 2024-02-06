import { expect, describe, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils/mockVuexStore";
import * as panelStore from "@/store/panel";
import * as applicationStore from "@/store/application";
import * as nodeRepositoryStore from "@/store/nodeRepository";

import PlusIcon from "webapps-common/ui/assets/img/icons/node-stack.svg";
import Metainfo from "@/assets/metainfo.svg";

import NodeDialogWrapper from "@/components/uiExtensions/nodeDialogs/NodeDialogWrapper.vue";
import Sidebar from "../Sidebar.vue";
import SidebarExtensionPanel from "../SidebarExtensionPanel.vue";

describe("Sidebar", () => {
  const doMount = ({
    props = {},
    isWorkflowEmptyMock = vi.fn().mockReturnValue(false),
    mockFeatureFlags = {
      shouldDisplayEmbeddedDialogs: vi.fn(() => true),
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
          NodeDialogWrapper: true,
          SidebarSpaceExplorer: true,
          AiAssistant: true,
        },
      },
    });

    return { wrapper, $store, dispatchSpy, commitSpy };
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
    const { wrapper } = doMount();
    expect(wrapper.find(`[title="${tabName}"]`).classes("expanded")).toBe(true);

    await wrapper.find(`[title="${tabName}"]`).trigger("click");
    expect(wrapper.find(`[title="${tabName}"]`).classes("expanded")).toBe(true);
    expect(wrapper.find(`[title="${tabName}"]`).classes("active")).toBe(true);
  });

  it("clicking on open tab should close it", async () => {
    const tabName = "Description";
    const { wrapper } = doMount();
    await wrapper.find(`[title="${tabName}"]`).trigger("click");
    expect(wrapper.find(`[title="${tabName}"]`).classes("expanded")).toBe(
      false,
    );

    await wrapper.find(`[title="${tabName}"]`).trigger("click");
    expect(wrapper.find(`[title="${tabName}"]`).classes("expanded")).toBe(true);
  });

  it("click on node repository icon when description panel is open closes both panels", async () => {
    const { wrapper, $store } = doMount();
    // open node repository
    await wrapper.find('[title="Nodes"]').trigger("click");
    // emulate opening the description panel
    await $store.dispatch("panel/openExtensionPanel");
    expect($store.state.panel.isExtensionPanelOpen).toBe(true);

    await wrapper.find('[title="Nodes"]').trigger("click");
    expect($store.state.panel.isExtensionPanelOpen).toBe(false);
  });

  it("click on a different tab when extension panel is open, closes the extension panel", async () => {
    const { wrapper, $store } = doMount();

    await wrapper.find('[title="Nodes"]').trigger("click");
    // emulate opening the description panel
    await $store.dispatch("panel/openExtensionPanel");

    // back to Description
    await wrapper.find('[title="Description"]').trigger("click");

    // back to node repository
    await wrapper.find('[title="Nodes"]').trigger("click");

    expect($store.state.panel.isExtensionPanelOpen).toBe(false);
  });

  it("has portal for extension panel", () => {
    const { wrapper } = doMount();
    expect(wrapper.findComponent(SidebarExtensionPanel).exists()).toBe(true);
  });

  it("should not display node dialog section when flag is set to false", () => {
    const { wrapper } = doMount({
      mockFeatureFlags: {
        shouldDisplayEmbeddedDialogs: vi.fn(() => false),
        isKaiPermitted: () => false,
      },
    });

    expect(wrapper.find("ul").findAll("li").length).toBe(3);
    expect(wrapper.findComponent(NodeDialogWrapper).exists()).toBe(false);
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
