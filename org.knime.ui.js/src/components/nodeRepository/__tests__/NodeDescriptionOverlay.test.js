import { expect, describe, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import * as panelStore from "@/store/panel";

import NodeDescriptionOverlay from "../NodeDescriptionOverlay.vue";
import NodeDescription from "../NodeDescription.vue";

import { escapeStack as escapeStackMock } from "@/mixins/escapeStack";
import { nextTick } from "vue";
vi.mock("@/mixins/escapeStack", () => {
  // eslint-disable-next-line func-style
  function escapeStack({ onEscape }) {
    escapeStack.onEscape = onEscape;
    return {
      /* empty mixin */
    };
  }
  return { escapeStack };
});

describe("NodeDescription", () => {
  const doMount = ({ isSelectedNodeVisible = true } = {}) => {
    const getNodeDescription = () => ({
      id: 1,
      description: "This is a node.",
      links: [
        {
          text: "link",
          url: "www.link.com",
        },
      ],
    });

    const $store = mockVuexStore({
      nodeRepository: {
        state: {
          isDescriptionPanelOpen: false,
          selectedNode: null,
        },
        actions: {
          getNodeDescription,
          closeDescriptionPanel: () => {},
        },
        getters: {
          isSelectedNodeVisible() {
            return isSelectedNodeVisible;
          },
        },
      },
      panel: panelStore,
      application: {
        state: {
          activeProjectId: "project1",
        },
      },
    });

    $store.commit("panel/setActiveTab", {
      projectId: "project1",
      activeTab: panelStore.TABS.NODE_REPOSITORY,
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");

    const wrapper = mount(NodeDescriptionOverlay, {
      global: { plugins: [$store] },
    });

    return { wrapper, dispatchSpy, $store };
  };

  it("renders all components", async () => {
    const { wrapper, $store } = doMount();
    $store.state.nodeRepository.selectedNode = {
      id: 1,
      name: "Test",
      nodeFactory: {
        className: "some.class.name",
        settings: "",
      },
    };

    expect(wrapper.findComponent(NodeDescriptionOverlay).exists()).toBe(true);
    expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);

    await nextTick();

    expect(
      wrapper.findComponent(NodeDescription).props("selectedNode").id,
    ).toBe(1);
  });

  it("closes the panel when button is clicked", () => {
    const { wrapper, dispatchSpy } = doMount();
    const button = wrapper.find("button");
    button.trigger("click");
    expect(dispatchSpy).toHaveBeenCalledWith(
      "nodeRepository/closeDescriptionPanel",
      expect.anything(),
    );
  });

  it("closes on escape", () => {
    // adds event handler on mount
    const { wrapper, dispatchSpy } = doMount();
    dispatchSpy.mockClear();
    escapeStackMock.onEscape.call(wrapper.vm);

    expect(dispatchSpy).toHaveBeenCalledWith(
      "nodeRepository/closeDescriptionPanel",
      undefined,
    );
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });

  it("should check for selected node visibility only when the node repository tab is active", () => {
    const { wrapper, $store } = doMount({
      isSelectedNodeVisible: false,
    });

    $store.state.nodeRepository.isDescriptionPanelOpen = true;
    expect(
      wrapper.findComponent(NodeDescription).props("selectedNode"),
    ).toBeNull();
  });
});
