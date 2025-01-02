import { describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { mount } from "@vue/test-utils";

import PlusIcon from "@knime/styles/img/icons/node-stack.svg";

import Metainfo from "@/assets/metainfo.svg";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import { createNativeNode } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import Sidebar from "../Sidebar.vue";
import SidebarExtensionPanel from "../SidebarExtensionPanel.vue";

vi.mock("@/composables/useIsKaiEnabled");

describe("Sidebar", () => {
  const doMount = ({
    props = {},
    isWorkflowEmpty = false,
    isKaiEnabled = true,
  } = {}) => {
    const { testingPinia, panelStore, workflowStore, applicationStore } =
      mockStores();

    applicationStore.setActiveProjectId("activeProject1");

    workflowStore.setActiveWorkflow({
      projectId: "activeProject1",
      projectMetadata: {},
      info: {
        name: "fileName",
        containerType: "project" as any,
        containerId: "cntId",
      },
      nodeTemplates: {},
      connections: {},
      workflowAnnotations: [],
      dirty: false,
      nodes: isWorkflowEmpty ? {} : { "root:1": createNativeNode() },
    });

    const isKaiEnabledRef = ref(isKaiEnabled); // this one we can modify externally to affect the computed one
    const isKaiEnabledComputed = computed(() => isKaiEnabledRef.value);
    vi.mocked(useIsKaiEnabled).mockReturnValueOnce({
      isKaiEnabled: isKaiEnabledComputed,
    });

    const wrapper = mount(Sidebar, {
      props: {
        ...props,
      },
      global: {
        plugins: [testingPinia],
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

    return {
      wrapper,
      panelStore,
      activateTab,
      isKaiEnabledRef,
    };
  };

  it("renders default", () => {
    const { wrapper } = doMount();
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.findComponent(Metainfo).exists()).toBe(true);
    expect(wrapper.findComponent(PlusIcon).exists()).toBe(true);

    expect(wrapper.find('[title="Info"]').classes("active")).toBe(true);
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
    const tabName = "Info";
    const { wrapper, activateTab } = doMount();
    await activateTab(tabName);
    expect(wrapper.find(`[title="${tabName}"]`).classes("expanded")).toBe(
      false,
    );

    await activateTab(tabName);
    expect(wrapper.find(`[title="${tabName}"]`).classes("expanded")).toBe(true);
  });

  it("click on node repository icon when info panel is open closes both panels", async () => {
    const { panelStore, activateTab } = doMount();
    // open node repository
    await activateTab("Nodes");
    // emulate opening the info panel
    panelStore.openExtensionPanel();
    expect(panelStore.isExtensionPanelOpen).toBe(true);

    await activateTab("Nodes");
    expect(panelStore.isExtensionPanelOpen).toBe(false);
  });

  it("click on a different tab when extension panel is open, closes the extension panel", async () => {
    const { panelStore, activateTab } = doMount();

    await activateTab("Nodes");
    // emulate opening the info panel
    panelStore.openExtensionPanel();

    // back to Info
    await activateTab("Info");

    // back to node repository
    await activateTab("Nodes");

    expect(panelStore.isExtensionPanelOpen).toBe(false);
  });

  it("has portal for extension panel", () => {
    const { wrapper } = doMount();
    expect(wrapper.findComponent(SidebarExtensionPanel).exists()).toBe(true);
  });

  it("should show node repository if workflow is empty", () => {
    const { wrapper } = doMount({
      isWorkflowEmpty: true,
    });

    expect(wrapper.find('[title="Nodes"]').classes("active")).toBe(true);
    expect(wrapper.find('[title="Info"]').classes("active")).toBe(false);
    wrapper.findAll("li").forEach((wp) => {
      expect(wp.classes("expanded")).toBe(true);
    });
  });

  it("should hide the 'K-AI' tab if K-AI is disabled", () => {
    const { wrapper } = doMount({ isKaiEnabled: false });
    expect(wrapper.find('[title="K-AI"]').exists()).toBe(false);
  });

  it("should switch to the 'Info' tab from the 'K-AI' tab if K-AI gets disabled", async () => {
    const { wrapper, activateTab, isKaiEnabledRef } = doMount();
    await activateTab("K-AI");
    expect(wrapper.find('[title="K-AI"]').classes("active")).toBe(true);

    isKaiEnabledRef.value = false;

    await wrapper.vm.$nextTick();
    expect(wrapper.find('[title="Info"]').classes("active")).toBe(true);
  });
});
